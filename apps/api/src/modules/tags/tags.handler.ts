import { Hono } from "hono"
import { and, eq } from "drizzle-orm"
import {
  CreateTagRequest,
  DeleteTagResponse,
  ListTagsResponse,
  UpdateTagRequest,
} from "@bucketdrive/shared"
import { fileTag } from "@bucketdrive/shared/db/schema"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { getDB } from "../../lib/db"

interface TagsEnv {
  DB: D1Database
}

interface TagsVariables {
  user: { id: string; email: string; name: string }
  session: { id: string; userId: string; expiresAt: Date }
}

const tags = new Hono<{ Bindings: TagsEnv; Variables: TagsVariables }>()

tags.use("*", authMiddleware)

tags.get("/", requirePermission("files.read"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }

  const rows = await getDB()
    .select()
    .from(fileTag)
    .where(eq(fileTag.workspaceId, workspaceId))
    .all()

  return c.json(ListTagsResponse.parse({ data: rows }))
})

tags.post("/", requirePermission("files.tag"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }

  const db = getDB()
  const body = CreateTagRequest.parse(await c.req.json())
  const existing = await db
    .select({ id: fileTag.id })
    .from(fileTag)
    .where(and(eq(fileTag.workspaceId, workspaceId), eq(fileTag.name, body.name)))
    .get()

  if (existing) {
    return c.json({ code: "CONFLICT", message: "Tag name already exists" }, 409)
  }

  const now = new Date().toISOString()
  const created = {
    id: crypto.randomUUID(),
    workspaceId,
    name: body.name,
    color: body.color,
    createdAt: now,
  }

  await db.insert(fileTag).values(created).run()
  return c.json(created, 201)
})

tags.patch("/:tagId", requirePermission("files.tag"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const tagId = c.req.param("tagId")
  if (!workspaceId || !tagId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId and tagId are required" }, 400)
  }

  const db = getDB()
  const body = UpdateTagRequest.parse(await c.req.json())
  const existing = await db
    .select()
    .from(fileTag)
    .where(and(eq(fileTag.id, tagId), eq(fileTag.workspaceId, workspaceId)))
    .get()

  if (!existing) {
    return c.json({ code: "NOT_FOUND", message: "Tag not found" }, 404)
  }

  if (body.name && body.name !== existing.name) {
    const duplicate = await db
      .select({ id: fileTag.id })
      .from(fileTag)
      .where(and(eq(fileTag.workspaceId, workspaceId), eq(fileTag.name, body.name)))
      .get()

    if (duplicate) {
      return c.json({ code: "CONFLICT", message: "Tag name already exists" }, 409)
    }
  }

  await db
    .update(fileTag)
    .set({
      name: body.name ?? existing.name,
      color: body.color ?? existing.color,
    })
    .where(eq(fileTag.id, tagId))
    .run()

  const updated = await db.select().from(fileTag).where(eq(fileTag.id, tagId)).get()
  return c.json(updated)
})

tags.delete("/:tagId", requirePermission("files.tag"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const tagId = c.req.param("tagId")
  if (!workspaceId || !tagId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId and tagId are required" }, 400)
  }

  const db = getDB()
  const existing = await db
    .select({ id: fileTag.id })
    .from(fileTag)
    .where(and(eq(fileTag.id, tagId), eq(fileTag.workspaceId, workspaceId)))
    .get()

  if (!existing) {
    return c.json({ code: "NOT_FOUND", message: "Tag not found" }, 404)
  }

  await db.delete(fileTag).where(eq(fileTag.id, tagId)).run()

  return c.json(
    DeleteTagResponse.parse({
      success: true,
      tagId,
    }),
  )
})

export const tagsHandler = tags
