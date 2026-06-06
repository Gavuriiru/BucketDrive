import { Hono } from "hono"
import { eq } from "drizzle-orm"
import {
  AddMemberRequest,
  ListMembersResponse,
  RemoveMemberResponse,
  UpdateMemberRoleRequest,
} from "@bucketdrive/shared"
import { auditLog, bucketInvitation, user } from "@bucketdrive/shared/db/schema"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { getDB } from "../../lib/db"

interface MembersEnv {
  DB: D1Database
  APP_URL?: string
}

interface MembersVariables {
  user: { id: string; email: string; name: string; role: string }
  session: { id: string; userId: string; expiresAt: Date }
}

const members = new Hono<{ Bindings: MembersEnv; Variables: MembersVariables }>()

members.use("*", authMiddleware)

members.get("/", requirePermission("users.read"), async (c) => {
  const rows = await getDB().select().from(user).all()
  const data = rows.map((row) => ({
    id: row.id,
    userId: row.id,
    role: row.role,
    email: row.email,
    name: row.name,
    image: row.image,
    createdAt: row.createdAt,
  }))
  return c.json(
    ListMembersResponse.parse({
      data,
      meta: {
        page: 1,
        limit: data.length || 1,
        total: data.length,
        totalPages: data.length > 0 ? 1 : 0,
      },
    }),
  )
})

members.post("/", requirePermission("users.invite"), async (c) => {
  const actor = c.get("user")
  const db = getDB()
  const body = AddMemberRequest.parse(await c.req.json())
  const targetUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, body.email.toLowerCase()))
    .get()
  if (targetUser)
    return c.json({ code: "USER_ALREADY_MEMBER", message: "User already exists" }, 409)
  const existingInvite = await db
    .select({ id: bucketInvitation.id })
    .from(bucketInvitation)
    .where(eq(bucketInvitation.email, body.email.toLowerCase()))
    .get()
  if (existingInvite)
    return c.json({ code: "CONFLICT", message: "Invitation already exists for this email" }, 409)
  const now = new Date()
  const token = crypto.randomUUID()
  const created = {
    id: crypto.randomUUID(),
    email: body.email.toLowerCase(),
    token,
    role: body.role,
    invitedBy: actor.id,
    status: "pending",
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  await db.insert(bucketInvitation).values(created).run()
  await writeAudit(db, actor.id, "member.invited", created.id, {
    email: body.email,
    role: body.role,
  })
  const baseUrl = c.env.APP_URL?.replace(/\/$/, "") ?? ""
  return c.json(
    { ...created, invitedByName: actor.name, inviteLink: `${baseUrl}/join?token=${token}` },
    201,
  )
})

members.patch("/:memberId", requirePermission("users.update_roles"), async (c) => {
  const memberId = c.req.param("memberId")
  const actor = c.get("user")
  const db = getDB()
  const body = UpdateMemberRoleRequest.parse(await c.req.json())
  const target = await db.select().from(user).where(eq(user.id, memberId)).get()
  if (!target) return c.json({ code: "NOT_FOUND", message: "Member not found" }, 404)
  if (target.role === "owner" && body.role !== "owner") {
    const owners = (await db.select({ id: user.id }).from(user).where(eq(user.role, "owner")).all())
      .length
    if (owners <= 1)
      return c.json({ code: "FORBIDDEN", message: "Cannot demote the last owner" }, 403)
  }
  await db
    .update(user)
    .set({ role: body.role, updatedAt: new Date().toISOString() })
    .where(eq(user.id, memberId))
    .run()
  await writeAudit(db, actor.id, "member.role_updated", memberId, {
    previousRole: target.role,
    role: body.role,
    userId: target.id,
  })
  const updated = await db.select().from(user).where(eq(user.id, memberId)).get()
  return c.json(
    updated
      ? {
          id: updated.id,
          userId: updated.id,
          role: updated.role,
          email: updated.email,
          name: updated.name,
          image: updated.image,
          createdAt: updated.createdAt,
        }
      : null,
  )
})

members.delete("/:memberId", requirePermission("users.remove"), async (c) => {
  const memberId = c.req.param("memberId")
  const actor = c.get("user")
  const db = getDB()
  const target = await db.select().from(user).where(eq(user.id, memberId)).get()
  if (!target) return c.json({ code: "NOT_FOUND", message: "Member not found" }, 404)
  if (target.role === "owner") {
    const owners = (await db.select({ id: user.id }).from(user).where(eq(user.role, "owner")).all())
      .length
    if (owners <= 1)
      return c.json({ code: "FORBIDDEN", message: "Cannot remove the last owner" }, 403)
  }
  await db.delete(user).where(eq(user.id, memberId)).run()
  await writeAudit(db, actor.id, "member.removed", memberId, {
    userId: target.id,
    role: target.role,
  })
  return c.json(RemoveMemberResponse.parse({ success: true, memberId }))
})

async function writeAudit(
  db: ReturnType<typeof getDB>,
  actorId: string,
  action: string,
  resourceId: string,
  metadata: Record<string, unknown>,
) {
  await db
    .insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      actorId,
      action,
      resourceType: "member",
      resourceId,
      metadata: JSON.stringify(metadata),
      createdAt: new Date().toISOString(),
    })
    .run()
}

export const membersHandler = members
