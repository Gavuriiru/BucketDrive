import { z } from "zod"
import { FolderSchema } from "../schemas/folder"
import { PaginatedResponseSchema } from "../schemas/common"

export const ListFoldersRequest = z.object({
  parentFolderId: z.string().uuid().nullable().optional(),
})

export const ListFoldersResponse = PaginatedResponseSchema(FolderSchema)

export const BreadcrumbItemSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string(),
})

export const BreadcrumbResponse = z.array(BreadcrumbItemSchema)

export type BreadcrumbItem = z.infer<typeof BreadcrumbItemSchema>
