import { eq, and } from "drizzle-orm"
import { getDB } from "../lib/db"
import {
  fileObject,
  uploadSession,
  uploadPart,
  bucket,
  auditLog,
  workspace,
} from "@bucketdrive/shared/db/schema"
import type { StorageProvider } from "./storage"

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".msi", ".app", ".dmg"]
const BLOCKED_MIME_PREFIXES = [
  "application/x-msdownload",
  "application/x-ms-installer",
  "application/x-executable",
]

export class UploadError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = "UploadError"
  }
}

export interface InitiateUploadParams {
  workspaceId: string
  userId: string
  folderId?: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  checksum?: string
}

export interface InitiateUploadResult {
  uploadId: string
  signedUrl: string
  expiresAt: string
  storageKey: string
}

export interface CompleteUploadParams {
  workspaceId: string
  userId: string
  uploadId: string
  fileName: string
  mimeType: string
  folderId?: string | null
  parts?: Array<{ partNumber: number; etag: string; sizeBytes: number }>
}

export class UploadService {
  constructor(private storage: StorageProvider) {}

  async initiateUpload(params: InitiateUploadParams): Promise<InitiateUploadResult> {
    const db = getDB()

    this.validateFileType(params.fileName, params.mimeType)

    if (params.sizeBytes > MAX_FILE_SIZE) {
      throw new UploadError("FILE_TOO_LARGE", `Max file size is ${String(MAX_FILE_SIZE / 1e9)} GB`)
    }

    const ws = await db
      .select()
      .from(workspace)
      .where(eq(workspace.id, params.workspaceId))
      .get()

    if (!ws) {
      throw new UploadError("WORKSPACE_NOT_FOUND", "Workspace not found")
    }

    const wsBucket = await db
      .select()
      .from(bucket)
      .where(eq(bucket.workspaceId, params.workspaceId))
      .get()

    if (!wsBucket) {
      throw new UploadError("NOT_FOUND", "No storage bucket found for workspace")
    }

    const allFiles = await db
      .select()
      .from(fileObject)
      .where(
        and(
          eq(fileObject.workspaceId, params.workspaceId),
          eq(fileObject.isDeleted, false),
        ),
      )
      .all()

    const totalUsed = allFiles.reduce((sum, f) => sum + f.sizeBytes, 0)

    if (totalUsed + params.sizeBytes > ws.storageQuotaBytes) {
      throw new UploadError("QUOTA_EXCEEDED", "Workspace storage quota exceeded")
    }

    const uploadId = crypto.randomUUID()
    const storeKey = `workspace/${params.workspaceId}/files/${crypto.randomUUID()}`

    const signedUrl = await this.storage.generateSignedUploadUrl(storeKey)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await db
      .insert(uploadSession)
      .values({
        id: uploadId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        bucketId: wsBucket.id,
        status: "initiated",
        uploadType: params.sizeBytes <= 5 * 1024 * 1024 ? "single" : "multipart",
        totalSize: params.sizeBytes,
        storageKey: storeKey,
        totalParts:
          params.sizeBytes <= 5 * 1024 * 1024
            ? 1
            : Math.ceil(params.sizeBytes / (5 * 1024 * 1024)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run()

    return {
      uploadId,
      signedUrl,
      expiresAt,
      storageKey: storeKey,
    }
  }

  async completeUpload(params: CompleteUploadParams) {
    const db = getDB()

    const session = await db
      .select()
      .from(uploadSession)
      .where(eq(uploadSession.id, params.uploadId))
      .get()

    if (!session) {
      throw new UploadError("NOT_FOUND", "Upload session not found")
    }

    if (session.status === "completed") {
      throw new UploadError("CONFLICT", "Upload already completed")
    }

    if (session.userId !== params.userId) {
      throw new UploadError("FORBIDDEN", "Cannot complete another user's upload")
    }

    const ext = params.fileName.includes(".")
      ? (params.fileName.split(".").pop()?.toLowerCase() ?? null)
      : null

    const fileId = crypto.randomUUID()
    const now = new Date().toISOString()
    const storedKey = session.storageKey ?? `workspace/${params.workspaceId}/files/${fileId}`

    if (params.parts && params.parts.length > 0) {
      for (const part of params.parts) {
        await db
          .insert(uploadPart)
          .values({
            id: crypto.randomUUID(),
            uploadSessionId: session.id,
            partNumber: part.partNumber,
            etag: part.etag,
            sizeBytes: part.sizeBytes,
            uploadedAt: now,
          })
          .run()
      }
    }

    await db
      .insert(fileObject)
      .values({
        id: fileId,
        workspaceId: params.workspaceId,
        bucketId: session.bucketId,
        folderId: params.folderId ?? null,
        ownerId: params.userId,
        storageKey: storedKey,
        originalName: params.fileName,
        mimeType: params.mimeType,
        extension: ext,
        sizeBytes: session.totalSize,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    await db
      .update(uploadSession)
      .set({
        status: "completed",
        uploadedSize: session.totalSize,
        partsCompleted: params.parts?.length ?? 1,
        updatedAt: now,
      })
      .where(eq(uploadSession.id, params.uploadId))
      .run()

    await db
      .insert(auditLog)
      .values({
        id: crypto.randomUUID(),
        workspaceId: params.workspaceId,
        actorId: params.userId,
        action: "file.upload",
        resourceType: "file",
        resourceId: fileId,
        createdAt: now,
      })
      .run()

    const created = await db
      .select()
      .from(fileObject)
      .where(eq(fileObject.id, fileId))
      .get()

    if (!created) {
      throw new UploadError("INTERNAL_ERROR", "Failed to create file record")
    }

    return created
  }

  private validateFileType(fileName: string, mimeType: string): void {
    const extPart = fileName.split(".").pop()?.toLowerCase()
    const ext = fileName.includes(".") && extPart ? `.${extPart}` : ""

    if (ext && BLOCKED_EXTENSIONS.includes(ext)) {
      throw new UploadError("BLOCKED_EXTENSION", `File type ${ext} is not allowed`)
    }

    const blocked = BLOCKED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))
    if (blocked) {
      throw new UploadError("BLOCKED_MIME", `MIME type ${mimeType} is not allowed`)
    }

    if (fileName.includes("\0") || fileName.includes("..")) {
      throw new UploadError("INVALID_NAME", "File name contains invalid characters")
    }
  }
}
