import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import { getDB } from "../../lib/db"
import { workspace, workspaceMember } from "@bucketdrive/shared"
import { eq } from "drizzle-orm"

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

  const memberships = await db
    .select()
    .from(workspaceMember)
    .where(eq(workspaceMember.userId, user.id))
    .all()

  if (memberships.length === 0) {
    return c.json({ data: [] })
  }

  const workspaceIds = memberships.map((m) => m.workspaceId)
  const allWorkspaces = await db.select().from(workspace).all()
  const roleByWorkspaceId = new Map(memberships.map((membership) => [membership.workspaceId, membership.role]))
  const userWorkspaces = allWorkspaces
    .filter((w) => workspaceIds.includes(w.id))
    .map((w) => ({
      ...w,
      role: roleByWorkspaceId.get(w.id) ?? "viewer",
    }))

  return c.json({ data: userWorkspaces })
})

export const workspacesHandler = workspaces
