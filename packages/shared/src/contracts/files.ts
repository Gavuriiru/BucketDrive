import { z } from "zod"
import { FileObjectSchema } from "../schemas/file"
import { PaginatedResponseSchema } from "../schemas/common"

export const ListFilesRequest = z.object({
  folderId: z.string().uuid().nullable().optional(),
  sort: z.enum(["name", "created_at", "size", "type"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  view: z.enum(["grid", "list"]).default("grid"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const ListFilesResponse = PaginatedResponseSchema(FileObjectSchema)

export const InitiateUploadRequest = z.object({
  folderId: z.string().uuid().nullable().optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  checksum: z.string().optional(),
})

export const InitiateUploadResponse = z.object({
  uploadId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  signedUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  storageKey: z.string(),
  partSize: z.number().optional(),
  totalParts: z.number().optional(),
})

export const CompleteUploadRequest = z.object({
  uploadId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  folderId: z.string().uuid().nullable().optional(),
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      etag: z.string(),
      sizeBytes: z.number().int().positive(),
    })
  ).optional(),
})

export const DownloadUrlResponse = z.object({
  signedUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  fileName: z.string(),
})

export const UpdateFileRequest = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
})

export const UpdateFileTagsRequest = z.object({
  tagIds: z.array(z.string().uuid()),
})
