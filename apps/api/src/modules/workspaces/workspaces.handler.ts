import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import { getDB } from "../../lib/db"
import { listWorkspaceMembershipsForUser, normalizeWorkspaceRole } from "../../lib/workspace-membership"

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

export const workspacesHandler = workspaces
