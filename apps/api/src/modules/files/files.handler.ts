import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"

const files = new Hono()

files.use("*", authMiddleware)

files.get("/", requirePermission("files.read"), async (c) => {
  // TODO: List files in workspace
  return c.json({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } })
})

files.post("/upload", requirePermission("files.upload"), async (c) => {
  // TODO: Initiate upload
  return c.json({ message: "Upload initiated" })
})

files.get("/:fileId", requirePermission("files.read"), async (c) => {
  // TODO: Get file metadata
  return c.json({ message: "File metadata" })
})

files.patch("/:fileId", requirePermission("files.rename"), async (c) => {
  // TODO: Update file (rename/move)
  return c.json({ message: "File updated" })
})

files.delete("/:fileId", requirePermission("files.delete"), async (c) => {
  // TODO: Soft-delete file
  return c.json({ message: "File deleted" })
})

export const filesHandler = files
