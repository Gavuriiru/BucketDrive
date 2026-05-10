import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { createStorageProvider } from "../../services/storage"
import { UploadService, UploadError } from "../../services/upload.service"
import { TrashService, TrashServiceError, getWorkspaceRole } from "../../services/trash.service"
import { getDB } from "../../lib/db"
import { hydrateFiles } from "./file-query"
import { auditLog, favorite, fileObject, fileObjectTag, fileTag } from "@bucketdrive/shared/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import {
  InitiateUploadRequest,
  CompleteUploadRequest,
  ListFilesRequest,
  ToggleFavoriteResponse,
  UpdateFileRequest,
  UpdateFileTagsRequest,
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
  const user = c.get("user")

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
  const paged = await hydrateFiles(db, workspaceId, user.id, sorted.slice(start, start + limit))

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
      const status = statusMap[err.code] ?? 400
      return c.json({ code: err.code, message: err.message }, status as never)
    }
    throw err
  }
})

files.get("/:fileId", requirePermission("files.read"), async (c) => {
  const fileId = c.req.param("fileId")
  const db = getDB()
  const user = c.get("user")

  const file = await db
    .select()
    .from(fileObject)
    .where(eq(fileObject.id, fileId))
    .get()

  if (!file) {
    return c.json({ code: "FILE_NOT_FOUND", message: "File not found" }, 404)
  }

  const [hydrated] = await hydrateFiles(db, file.workspaceId, user.id, [file])
  return c.json(hydrated ?? file)
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
  const workspaceId = c.req.param("workspaceId")
  const fileId = c.req.param("fileId")

  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }
  if (!fileId) {
    return c.json({ code: "VALIDATION_ERROR", message: "fileId is required" }, 400)
  }

  const user = c.get("user")
  const body = UpdateFileRequest.parse(await c.req.json())
  const db = getDB()
  const now = new Date().toISOString()

  const file = await db
    .select()
    .from(fileObject)
    .where(and(eq(fileObject.id, fileId), eq(fileObject.workspaceId, workspaceId)))
    .get()

  if (!file || file.isDeleted) {
    return c.json({ code: "FILE_NOT_FOUND", message: "File not found" }, 404)
  }

  const updateSet: Record<string, unknown> = { updatedAt: now }

  if (body.name !== undefined) {
    const newExt = body.name.includes(".")
      ? (body.name.split(".").pop()?.toLowerCase() ?? null)
      : null
    updateSet.originalName = body.name
    updateSet.extension = newExt
  }

  if (body.folderId !== undefined) {
    updateSet.folderId = body.folderId
  }

  await db
    .update(fileObject)
    .set(updateSet)
    .where(eq(fileObject.id, fileId))
    .run()

  const updated = await db
    .select()
    .from(fileObject)
    .where(eq(fileObject.id, fileId))
    .get()

  const isMove = body.folderId !== undefined && body.folderId !== file.folderId
  const isRename = body.name !== undefined && body.name !== file.originalName

  if (isRename || isMove) {
    const action = isMove ? "file.move" : "file.rename"
    const metadata: Record<string, unknown> = {}
    if (isRename) {
      metadata.previousName = file.originalName
      metadata.newName = body.name
    }
    if (isMove) {
      metadata.previousFolderId = file.folderId
      metadata.newFolderId = body.folderId
    }

    await db
      .insert(auditLog)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        actorId: user.id,
        action,
        resourceType: "file",
        resourceId: fileId,
        metadata: JSON.stringify(metadata),
        createdAt: now,
      })
      .run()
  }

  return c.json(updated)
})

files.post("/:fileId/favorite", requirePermission("files.favorite"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const fileId = c.req.param("fileId")

  if (!workspaceId || !fileId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId and fileId are required" }, 400)
  }

  const user = c.get("user")
  const db = getDB()
  const file = await db
    .select()
    .from(fileObject)
    .where(and(eq(fileObject.id, fileId), eq(fileObject.workspaceId, workspaceId)))
    .get()

  if (!file || file.isDeleted) {
    return c.json({ code: "FILE_NOT_FOUND", message: "File not found" }, 404)
  }

  const existing = await db
    .select()
    .from(favorite)
    .where(and(eq(favorite.fileObjectId, fileId), eq(favorite.userId, user.id)))
    .get()

  const nextIsFavorited = !(existing?.isActive ?? false)

  if (existing) {
    await db
      .update(favorite)
      .set({ isActive: nextIsFavorited })
      .where(eq(favorite.id, existing.id))
      .run()
  } else {
    await db
      .insert(favorite)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        fileObjectId: fileId,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
      .run()
  }

  return c.json(
    ToggleFavoriteResponse.parse({
      fileId,
      isFavorited: nextIsFavorited,
    }),
  )
})

files.post("/:fileId/tags", requirePermission("files.tag"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const fileId = c.req.param("fileId")

  if (!workspaceId || !fileId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId and fileId are required" }, 400)
  }

  const body = UpdateFileTagsRequest.parse(await c.req.json())
  const db = getDB()

  const file = await db
    .select()
    .from(fileObject)
    .where(and(eq(fileObject.id, fileId), eq(fileObject.workspaceId, workspaceId)))
    .get()

  if (!file || file.isDeleted) {
    return c.json({ code: "FILE_NOT_FOUND", message: "File not found" }, 404)
  }

  const uniqueTagIds = Array.from(new Set(body.tagIds))
  if (uniqueTagIds.length > 0) {
    const tags = await db
      .select({ id: fileTag.id })
      .from(fileTag)
      .where(and(eq(fileTag.workspaceId, workspaceId), inArray(fileTag.id, uniqueTagIds)))
      .all()

    if (tags.length !== uniqueTagIds.length) {
      return c.json({ code: "VALIDATION_ERROR", message: "One or more tags are invalid" }, 400)
    }
  }

  await db.delete(fileObjectTag).where(eq(fileObjectTag.fileObjectId, fileId)).run()

  if (uniqueTagIds.length > 0) {
    await db.insert(fileObjectTag).values(
      uniqueTagIds.map((tagId) => ({
        id: crypto.randomUUID(),
        fileObjectId: fileId,
        tagId,
      })),
    ).run()
  }

  const updated = await db
    .select()
    .from(fileObject)
    .where(eq(fileObject.id, fileId))
    .get()

  if (!updated) {
    return c.json({ code: "FILE_NOT_FOUND", message: "File not found" }, 404)
  }

  const [hydrated] = await hydrateFiles(db, workspaceId, c.get("user").id, [updated])
  return c.json(hydrated ?? updated)
})

files.post("/:fileId/restore", requirePermission("files.restore"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const fileId = c.req.param("fileId")

  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }
  if (!fileId) {
    return c.json({ code: "VALIDATION_ERROR", message: "fileId is required" }, 400)
  }

  const user = c.get("user")
  const trashService = new TrashService(getDB(), createStorageProvider(c.env))

  try {
    const result = await trashService.restoreFile({
      workspaceId,
      fileId,
      actorId: user.id,
    })

    return c.json(result)
  } catch (err) {
    if (err instanceof TrashServiceError) {
      return c.json({ code: err.code, message: err.message }, err.status as never)
    }
    throw err
  }
})

files.delete("/:fileId/permanent", async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const fileId = c.req.param("fileId")

  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }
  if (!fileId) {
    return c.json({ code: "VALIDATION_ERROR", message: "fileId is required" }, 400)
  }

  const user = c.get("user")
  const db = getDB()
  const role = await getWorkspaceRole(db, workspaceId, user.id)

  if (!role) {
    return c.json({ code: "WORKSPACE_ACCESS_DENIED", message: "Not a workspace member" }, 403)
  }

  if (role !== "owner" && role !== "admin") {
    return c.json({ code: "FORBIDDEN", message: "Only owners and admins can permanently delete files" }, 403)
  }

  const trashService = new TrashService(db, createStorageProvider(c.env))

  try {
    const result = await trashService.permanentlyDeleteFile({
      workspaceId,
      fileId,
      actorId: user.id,
    })

    return c.json(result)
  } catch (err) {
    if (err instanceof TrashServiceError) {
      return c.json({ code: err.code, message: err.message }, err.status as never)
    }
    throw err
  }
})

files.delete("/:fileId", requirePermission("files.delete"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const fileId = c.req.param("fileId")

  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }
  if (!fileId) {
    return c.json({ code: "VALIDATION_ERROR", message: "fileId is required" }, 400)
  }

  const user = c.get("user")
  const trashService = new TrashService(getDB(), createStorageProvider(c.env))

  try {
    const result = await trashService.softDeleteFile({
      workspaceId,
      fileId,
      actorId: user.id,
    })

    return c.json(result)
  } catch (err) {
    if (err instanceof TrashServiceError) {
      return c.json({ code: err.code, message: err.message }, err.status as never)
    }
    throw err
  }
})

export const filesHandler = files
