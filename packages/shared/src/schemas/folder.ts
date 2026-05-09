import { z } from "zod"

export const FolderSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  parentFolderId: z.string().uuid().nullable(),
  name: z.string(),
  path: z.string(),
  createdBy: z.string().uuid(),
  isDeleted: z.boolean(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Folder = z.infer<typeof FolderSchema>
