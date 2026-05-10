import { Hono } from "hono"
import { SearchRequest, SearchResponse } from "@bucketdrive/shared"
import type { fileObject } from "@bucketdrive/shared/db/schema"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { getDB } from "../../lib/db"
import { buildFtsQuery, getMimePrefixesForCategory, hydrateFiles } from "../files/file-query"

interface SearchEnv {
  DB: D1Database
}

interface SearchVariables {
  user: { id: string; email: string; name: string }
  session: { id: string; userId: string; expiresAt: Date }
}

type SearchSort = "relevance" | "name" | "created_at" | "size" | "type"
type SearchFileRow = typeof fileObject.$inferSelect

const FILE_SELECT = `
  f.id,
  f.workspace_id AS workspaceId,
  f.bucket_id AS bucketId,
  f.folder_id AS folderId,
  f.owner_id AS ownerId,
  f.storage_key AS storageKey,
  f.original_name AS originalName,
  f.mime_type AS mimeType,
  f.extension AS extension,
  f.size_bytes AS sizeBytes,
  f.checksum AS checksum,
  f.is_deleted AS isDeleted,
  f.deleted_at AS deletedAt,
  f.created_at AS createdAt,
  f.updated_at AS updatedAt
`

const search = new Hono<{ Bindings: SearchEnv; Variables: SearchVariables }>()

search.use("*", authMiddleware)

search.get("/", requirePermission("files.read"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400)
  }

  const request = SearchRequest.parse({
    q: c.req.query("q") ?? undefined,
    type: c.req.query("type"),
    tags: c.req.queries("tags"),
    favorite: c.req.query("favorite"),
    sort: c.req.query("sort"),
    order: c.req.query("order"),
    page: c.req.query("page"),
    limit: c.req.query("limit"),
  })

  const user = c.get("user")
  const db = getDB()
  const q = request.q?.trim()
  const hasTextSearch = Boolean(q)
  const ftsQuery = q ? buildFtsQuery(q) : ""
  const sort = normalizeSort(request.sort, hasTextSearch)
  const order = request.order
  const offset = (request.page - 1) * request.limit

  const whereClauses: string[] = ["f.workspace_id = ?", "f.is_deleted = 0"]
  const params: unknown[] = [workspaceId]

  if (hasTextSearch) {
    whereClauses.unshift("file_search_idx MATCH ?")
    whereClauses.unshift("fs.workspace_id = ?")
    params.unshift(ftsQuery)
    params.unshift(workspaceId)
  }

  const mimePrefixes = getMimePrefixesForCategory(request.type)
  if (mimePrefixes.length > 0) {
    whereClauses.push(`(${mimePrefixes.map(() => "f.mime_type LIKE ?").join(" OR ")})`)
    for (const prefix of mimePrefixes) {
      params.push(`${prefix}%`)
    }
  }

  if (request.favorite) {
    whereClauses.push(
      "EXISTS (SELECT 1 FROM favorite fav WHERE fav.file_object_id = f.id AND fav.user_id = ? AND fav.is_active = 1)",
    )
    params.push(user.id)
  }

  if (request.tags && request.tags.length > 0) {
    whereClauses.push(`
      f.id IN (
        SELECT fot.file_object_id
        FROM file_object_tag fot
        JOIN file_tag ft ON ft.id = fot.tag_id
        WHERE ft.workspace_id = ? AND fot.tag_id IN (${request.tags.map(() => "?").join(", ")})
        GROUP BY fot.file_object_id
        HAVING COUNT(DISTINCT fot.tag_id) = ?
      )
    `)
    params.push(workspaceId, ...request.tags, request.tags.length)
  }

  const fromClause = hasTextSearch
    ? "FROM file_search_idx fs JOIN file_object f ON f.id = fs.file_id"
    : "FROM file_object f"
  const whereClause = whereClauses.join(" AND ")
  const rankSelect = hasTextSearch ? ", bm25(file_search_idx) AS rank" : ""
  const orderClause = buildOrderClause(sort, order, hasTextSearch)

  const countStmt = c.env.DB
    .prepare(`
      SELECT COUNT(*) AS count
      ${fromClause}
      WHERE ${whereClause}
    `)
    .bind(...params)

  const rowsStmt = c.env.DB
    .prepare(`
      SELECT ${FILE_SELECT}${rankSelect}
      ${fromClause}
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `)
    .bind(...params, request.limit, offset)

  const [countRow, rowResult] = await Promise.all([
    countStmt.first<{ count: number }>(),
    rowsStmt.all<Record<string, unknown>>(),
  ])

  const rows = (rowResult.results ?? []) as SearchFileRow[]
  const hydrated = await hydrateFiles(db, workspaceId, user.id, rows)
  const total = countRow?.count ?? 0

  return c.json(
    SearchResponse.parse({
      data: hydrated,
      meta: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages: Math.ceil(total / request.limit),
      },
    }),
  )
})

function normalizeSort(sort: SearchSort, hasTextSearch: boolean): SearchSort {
  if (!hasTextSearch && sort === "relevance") {
    return "name"
  }

  return sort
}

function buildOrderClause(sort: SearchSort, order: "asc" | "desc", hasTextSearch: boolean): string {
  if (sort === "relevance" && hasTextSearch) {
    return "rank ASC, f.original_name ASC"
  }

  const direction = order.toUpperCase()
  const secondary = hasTextSearch ? ", rank ASC" : ""

  switch (sort) {
    case "created_at":
      return `f.created_at ${direction}${secondary}, f.original_name ASC`
    case "size":
      return `f.size_bytes ${direction}${secondary}, f.original_name ASC`
    case "type":
      return `COALESCE(f.extension, '') ${direction}${secondary}, f.original_name ASC`
    case "name":
    default:
      return `f.original_name ${direction}${secondary}`
  }
}

export const searchHandler = search
