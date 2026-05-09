import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { getDB } from "../../lib/db"
import { folder, workspace } from "@bucketdrive/shared/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { ListFoldersRequest, BreadcrumbItemSchema } from "@bucketdrive/shared"

interface FoldersEnv {
  DB: D1Database
}

interface FoldersVariables {
  user: { id: string; email: string; name: string }
  session: { id: string; userId: string; expiresAt: Date }
}

const folders = new Hono<{ Bindings: FoldersEnv; Variables: FoldersVariables }>()

folders.use("*", authMiddleware)

folders.get("/", requirePermission("files.read"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }

  const query = ListFoldersRequest.parse(c.req.query())
  const db = getDB()

  const where = query.parentFolderId
    ? and(
        eq(folder.workspaceId, workspaceId),
        eq(folder.parentFolderId, query.parentFolderId),
        eq(folder.isDeleted, false),
      )
    : and(
        eq(folder.workspaceId, workspaceId),
        isNull(folder.parentFolderId),
        eq(folder.isDeleted, false),
      )

  const rows = await db
    .select()
    .from(folder)
    .where(where)
    .all()

  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name))

  return c.json({
    data: sorted,
    meta: {
      page: 1,
      limit: sorted.length,
      total: sorted.length,
      totalPages: 1,
    },
  })
})

folders.get("/:folderId/breadcrumbs", requirePermission("files.read"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const folderId = c.req.param("folderId")

  if (!workspaceId || !folderId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId and folderId are required" }, 400)
  }

  const db = getDB()

  const ws = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .get()

  if (!ws) {
    return c.json({ code: "WORKSPACE_NOT_FOUND", message: "Workspace not found" }, 404)
  }

  const segments: { id: string | null; name: string }[] = []

  let currentFolderId: string | null = folderId

  while (currentFolderId) {
    const f = await db
      .select()
      .from(folder)
      .where(eq(folder.id, currentFolderId))
      .get()

    if (!f) break

    segments.unshift({ id: f.id, name: f.name })
    currentFolderId = f.parentFolderId
  }

  segments.unshift({ id: null, name: ws.name })

  const result = segments.map((item) => BreadcrumbItemSchema.parse(item))

  return c.json(result)
})

export const foldersHandler = folders
