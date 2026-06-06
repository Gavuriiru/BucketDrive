import { createMiddleware } from "hono/factory"
import { eq } from "drizzle-orm"
import { fileObject, folder } from "@bucketdrive/shared/db/schema"
import { getDB } from "../lib/db"
import { can, type Permission } from "@bucketdrive/shared"
import type { WorkspaceRole } from "@bucketdrive/shared"

interface RbacVariables {
  user: { id: string; email: string; name: string; role: WorkspaceRole }
  bucketRole?: WorkspaceRole
}

export const requirePermission = (permission: Permission) => {
  return createMiddleware<{ Variables: RbacVariables }>(async (c, next) => {
    const user = c.get("user")
    const db = getDB()
    const role = user.role

    let resourceOwnerId: string | undefined

    if (permission === "files.delete" || permission === "files.restore") {
      const fileId = c.req.param("fileId")
      if (fileId) {
        const file = await db
          .select({ ownerId: fileObject.ownerId })
          .from(fileObject)
          .where(eq(fileObject.id, fileId))
          .get()
        resourceOwnerId = file?.ownerId
      }
    }

    if (permission === "folders.delete" || permission === "folders.restore") {
      const folderId = c.req.param("folderId")
      if (folderId) {
        const targetFolder = await db
          .select({ createdBy: folder.createdBy })
          .from(folder)
          .where(eq(folder.id, folderId))
          .get()
        resourceOwnerId = targetFolder?.createdBy
      }
    }

    const allowed = can(role, permission, resourceOwnerId, user.id)

    if (!allowed) {
      return c.json({ code: "FORBIDDEN", message: `Permission denied: ${permission}` }, 403)
    }

    c.set("bucketRole", role)
    await next()
  })
}
