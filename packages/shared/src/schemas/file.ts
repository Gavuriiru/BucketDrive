import { z } from "zod"

export const FileObjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  bucketId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
  ownerId: z.string().uuid(),
  storageKey: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  extension: z.string().nullable(),
  sizeBytes: z.number().int().min(0),
  checksum: z.string().nullable(),
  isDeleted: z.boolean(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tags: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    color: z.string(),
  })).optional(),
  isFavorited: z.boolean().optional(),
})

export type FileObject = z.infer<typeof FileObjectSchema>
