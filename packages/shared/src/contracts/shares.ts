import { z } from "zod"
import { ShareLinkSchema } from "../schemas/share"
import { PaginatedResponseSchema } from "../schemas/common"

export const CreateShareRequest = z.object({
  resourceId: z.string().uuid(),
  resourceType: z.enum(["file", "folder"]),
  shareType: z.enum(["internal", "external_direct", "external_explorer"]),
  password: z.string().min(4).max(128).optional(),
  expiresAt: z.string().datetime().optional(),
  permissions: z.array(z.enum(["read", "download"])).optional(),
})

export const ListSharesResponse = PaginatedResponseSchema(ShareLinkSchema)

export const UpdateShareRequest = z.object({
  password: z.string().min(4).max(128).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const ShareAccessRequest = z.object({
  password: z.string().optional(),
})

export const ShareAccessResponse = z.object({
  resourceType: z.enum(["file", "folder"]),
  resourceName: z.string(),
  signedUrl: z.string().url().optional(),
  files: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
      })
    )
    .optional(),
  folders: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
      })
    )
    .optional(),
})

export const ShareInfoResponse = z.object({
  id: z.string().uuid(),
  resourceType: z.enum(["file", "folder"]),
  resourceName: z.string(),
  shareType: z.enum(["internal", "external_direct", "external_explorer"]),
  hasPassword: z.boolean(),
  isActive: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string(),
})

export const ShareBrowseRequest = z.object({
  password: z.string().optional(),
})

export const ShareBrowseResponse = z.object({
  resourceName: z.string(),
  currentFolderId: z.string().uuid().nullable(),
  breadcrumbs: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    })
  ),
  files: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
    })
  ),
  folders: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    })
  ),
})
