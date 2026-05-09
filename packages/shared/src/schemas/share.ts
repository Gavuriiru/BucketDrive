import { z } from "zod"
import { ShareType } from "./common"

export const ShareLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  resourceType: z.enum(["file", "folder"]),
  resourceId: z.string().uuid(),
  shareType: ShareType,
  createdBy: z.string().uuid(),
  passwordHash: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  accessCount: z.number().int().min(0),
  lastAccessedAt: z.string().datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ShareLink = z.infer<typeof ShareLinkSchema>
