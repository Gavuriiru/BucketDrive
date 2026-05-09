import { createMiddleware } from "hono/factory"
import { and, eq } from "drizzle-orm"
import { workspaceMember } from "@bucketdrive/shared/db/schema"
import { getDB } from "../lib/db"
import { can, type Permission } from "@bucketdrive/shared"
import type { WorkspaceRole } from "@bucketdrive/shared"

interface RbacVariables {
  user: { id: string; email: string; name: string }
}

export const requirePermission = (permission: Permission) => {
  return createMiddleware<{ Variables: RbacVariables }>(async (c, next) => {
    const user = c.get("user")
    const workspaceId = c.req.param("workspaceId")

    if (!workspaceId) {
      return c.json({ code: "FORBIDDEN", message: "Permission denied" }, 403)
    }

    const db = getDB()
    const member = await db
      .select({ role: workspaceMember.role })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, user.id),
        ),
      )
      .get()

    if (!member) {
      return c.json(
        { code: "WORKSPACE_ACCESS_DENIED", message: "Not a workspace member" },
        403,
      )
    }

    const role = member.role as WorkspaceRole
    const allowed = can(role, permission)

    if (!allowed) {
      return c.json(
        { code: "FORBIDDEN", message: `Permission denied: ${permission}` },
        403,
      )
    }

    await next()
  })
}
