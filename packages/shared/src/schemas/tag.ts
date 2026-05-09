import { z } from "zod"

export const TagSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string().datetime(),
})

export type Tag = z.infer<typeof TagSchema>
