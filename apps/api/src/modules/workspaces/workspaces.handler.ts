import { Hono } from "hono"
import { and, eq } from "drizzle-orm"
import {
  InitiateOwnershipTransferRequest,
  OwnershipTransferResponse,
} from "@bucketdrive/shared"
import { authMiddleware } from "../../middleware/auth"
import { getDB } from "../../lib/db"
import { listWorkspaceMembershipsForUser, normalizeWorkspaceRole, syncWorkspaceMemberships } from "../../lib/workspace-membership"
import { workspace, member, workspaceMember, auditLog } from "@bucketdrive/shared/db/schema"

interface WorkspacesEnv {
  DB: D1Database
}

interface WorkspacesVariables {
  user: { id: string; email: string; name: string }
}

const workspaces = new Hono<{ Bindings: WorkspacesEnv; Variables: WorkspacesVariables }>()

workspaces.use("*", authMiddleware)

workspaces.get("/", async (c) => {
  const user = c.get("user")
  const db = getDB()

  const memberships = await listWorkspaceMembershipsForUser(db, user.id)
  if (memberships.length === 0) {
    return c.json({ data: [] })
  }

  return c.json({
    data: memberships.map((membership) => ({
      ...membership,
      role: normalizeWorkspaceRole(membership.role),
    })),
  })
})

workspaces.post("/:workspaceId/transfer-ownership", async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const actor = c.get("user")
  const db = getDB()
  const body = InitiateOwnershipTransferRequest.parse(await c.req.json())

  await syncWorkspaceMemberships(db, workspaceId)

  const ws = await db.select().from(workspace).where(eq(workspace.id, workspaceId)).get()
  if (!ws) {
    return c.json({ code: "WORKSPACE_NOT_FOUND", message: "Workspace not found" }, 404)
  }

  if (ws.ownerId !== actor.id) {
    return c.json({ code: "OWNER_REQUIRED", message: "Only the workspace owner can transfer ownership" }, 403)
  }

  if (ws.ownerId === body.newOwnerId) {
    return c.json({ code: "VALIDATION_ERROR", message: "New owner cannot be the current owner" }, 400)
  }

  const newOwnerMember = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, workspaceId), eq(member.userId, body.newOwnerId)))
    .get()

  if (!newOwnerMember) {
    return c.json({ code: "NOT_FOUND", message: "Target user is not a member of this workspace" }, 404)
  }

  const normalizedRole = normalizeWorkspaceRole(newOwnerMember.role)
  if (normalizedRole !== "admin") {
    return c.json({ code: "ROLE_TOO_LOW", message: "Ownership can only be transferred to an admin" }, 403)
  }

  const now = new Date().toISOString()

  // Transfer ownership
  await db.update(workspace).set({ ownerId: body.newOwnerId, updatedAt: now }).where(eq(workspace.id, workspaceId)).run()

  // Downgrade old owner to admin in member table
  const oldOwnerMember = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, workspaceId), eq(member.userId, actor.id)))
    .get()

  if (oldOwnerMember) {
    await db
      .update(member)
      .set({ role: "admin", createdAt: oldOwnerMember.createdAt })
      .where(eq(member.id, oldOwnerMember.id))
      .run()
    await db
      .update(workspaceMember)
      .set({ role: "admin" })
      .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, actor.id)))
      .run()
  }

  // Upgrade new owner
  await db
    .update(member)
    .set({ role: "owner", createdAt: newOwnerMember.createdAt })
    .where(eq(member.id, newOwnerMember.id))
    .run()
  await db
    .update(workspaceMember)
    .set({ role: "owner" })
    .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, body.newOwnerId)))
    .run()

  await db
    .insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      actorId: actor.id,
      action: "ownership.transferred",
      resourceType: "workspace",
      resourceId: workspaceId,
      metadata: JSON.stringify({ previousOwnerId: actor.id, newOwnerId: body.newOwnerId }),
      createdAt: now,
    })
    .run()

  return c.json(
    OwnershipTransferResponse.parse({
      success: true,
      workspaceId,
      previousOwnerId: actor.id,
      newOwnerId: body.newOwnerId,
    }),
  )
})

export const workspacesHandler = workspaces
