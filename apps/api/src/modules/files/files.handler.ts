import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { createStorageProvider } from "../../services/storage"
import { UploadService, UploadError } from "../../services/upload.service"
import { getDB } from "../../lib/db"
import { fileObject } from "@bucketdrive/shared/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import {
  InitiateUploadRequest,
  CompleteUploadRequest,
  ListFilesRequest,
} from "@bucketdrive/shared"

interface FilesEnv {
  STORAGE: R2Bucket
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ENDPOINT?: string
  DB: D1Database
}

interface FilesVariables {
  user: { id: string; email: string; name: string }
  session: { id: string; userId: string; expiresAt: Date }
}

const files = new Hono<{ Bindings: FilesEnv; Variables: FilesVariables }>()

files.use("*", authMiddleware)

files.get("/", requirePermission("files.read"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }

  const query = ListFilesRequest.parse(c.req.query())
  const db = getDB()

  const rows = await db
    .select()
    .from(fileObject)
    .where(
      and(
        eq(fileObject.workspaceId, workspaceId),
        eq(fileObject.isDeleted, false),
      ),
    )
    .all()

  const filtered = query.folderId
    ? rows.filter((f) => f.folderId === query.folderId)
    : rows

  const sorted = [...filtered].sort((a, b) => {
    const dir = query.order === "desc" ? -1 : 1
    switch (query.sort) {
      case "size":
        return (a.sizeBytes - b.sizeBytes) * dir
      case "created_at":
        return a.createdAt.localeCompare(b.createdAt) * dir
      case "type":
        return (a.extension ?? "").localeCompare(b.extension ?? "") * dir
      default:
        return a.originalName.localeCompare(b.originalName) * dir
    }
  })

  const page = query.page
  const limit = query.limit
  const start = (page - 1) * limit
  const paged = sorted.slice(start, start + limit)

  return c.json({
    data: paged,
    meta: {
      page,
      limit,
      total: sorted.length,
      totalPages: Math.ceil(sorted.length / limit),
    },
  })
})

files.post("/upload", requirePermission("files.upload"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }

  const user = c.get("user")
  const body = InitiateUploadRequest.parse(await c.req.json())

  const storage = createStorageProvider(c.env)
  const service = new UploadService(storage)

  try {
    const result = await service.initiateUpload({
      workspaceId,
      userId: user.id,
      folderId: body.folderId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      checksum: body.checksum,
    })

    return c.json(result, 201)
  } catch (err) {
    if (err instanceof UploadError) {
      return c.json({ code: err.code, message: err.message }, 400 as never)
    }
    throw err
  }
})

files.post("/upload/complete", requirePermission("files.upload"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }

  const user = c.get("user")
  const body = CompleteUploadRequest.parse(await c.req.json())

  const storage = createStorageProvider(c.env)
  const service = new UploadService(storage)

  try {
    const result = await service.completeUpload({
      workspaceId,
      userId: user.id,
      uploadId: body.uploadId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      folderId: body.folderId,
      parts: body.parts,
    })

    return c.json(result, 201)
  } catch (err) {
    if (err instanceof UploadError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        CONFLICT: 409,
      }
      return c.json({ code: err.code, message: err.message }, statusMap[err.code] as never ?? 400)
    }
    throw err
  }
})

files.get("/:fileId", requirePermission("files.read"), async (c) => {
  const fileId = c.req.param("fileId")
  const db = getDB()

  const file = await db
    .select()
    .from(fileObject)
    .where(eq(fileObject.id, fileId))
    .get()

  if (!file) {
    return c.json({ code: "FILE_NOT_FOUND", message: "File not found" }, 404)
  }

  return c.json(file)
})

files.get("/:fileId/download", requirePermission("files.read"), async (c) => {
  const fileId = c.req.param("fileId")
  const db = getDB()

  const file = await db
    .select()
    .from(fileObject)
    .where(eq(fileObject.id, fileId))
    .get()

  if (!file || file.isDeleted) {
    return c.json({ code: "FILE_NOT_FOUND", message: "File not found" }, 404)
  }

  const storage = createStorageProvider(c.env)
  const signedUrl = await storage.generateSignedDownloadUrl(file.storageKey)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  return c.json({
    signedUrl,
    expiresAt,
    fileName: file.originalName,
  })
})

files.patch("/:fileId", requirePermission("files.rename"), async (c) => {
  return c.json({ message: "File updated" })
})

files.delete("/:fileId", requirePermission("files.delete"), async (c) => {
  return c.json({ message: "File deleted" })
})

export const filesHandler = files
