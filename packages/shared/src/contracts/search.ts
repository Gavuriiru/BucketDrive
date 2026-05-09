import { z } from "zod"
import { PaginatedResponseSchema } from "../schemas/common"
import { FileObjectSchema } from "../schemas/file"

export const SearchRequest = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["all", "documents", "images", "videos", "audio", "archives"]).default("all"),
  tags: z.array(z.string().uuid()).optional(),
  favorite: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const SearchResponse = PaginatedResponseSchema(FileObjectSchema)
