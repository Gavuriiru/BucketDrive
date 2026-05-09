# Search System

# Purpose

This document defines the search architecture for the platform.

Search must support:
- Full-text search on file names and metadata
- Filtering by mime type, tags, dates, favorites
- Fast results on large datasets (thousands of files)
- Keyboard-first interaction
- Integration with the file explorer (search results behave like files)

The implementation uses SQLite FTS5 locally and D1's built-in text search in production,
avoiding the need for an external search engine.

---

# Core Principles

## 1. In-Database Search

Search runs inside D1/SQLite — no external search infrastructure (Typesense, Meilisearch, etc.).
This keeps the architecture simple and avoids operational complexity.

For the expected scale (thousands to low millions of files per workspace),
SQLite FTS5 provides sufficient performance with proper indexing.

## 2. Debounced, Not Real-Time

Search input is debounced (300ms) to avoid excessive database queries.
Results update after the user stops typing, not on every keystroke.

## 3. Integrated with Explorer

Search results reuse the same components as the file explorer:
- Same selection behavior (click, shift, ctrl/cmd)
- Same context menus (right-click → rename, share, delete, etc.)
- Same drag and drop
- Same keyboard shortcuts

The only difference: search results show a "search context" (breadcrumb or filter chips)
instead of a folder path.

---

# Search Schema

## FTS5 Virtual Table

```sql
-- D1 / SQLite
CREATE VIRTUAL TABLE IF NOT EXISTS file_search_idx USING fts5(
  original_name,
  extension,
  mime_type,
  content = 'file_object',
  content_rowid = 'id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS file_search_insert AFTER INSERT ON file_object
BEGIN
  INSERT INTO file_search_idx(rowid, original_name, extension, mime_type)
  VALUES (NEW.id, NEW.original_name, NEW.extension, NEW.mime_type);
END;

CREATE TRIGGER IF NOT EXISTS file_search_delete AFTER DELETE ON file_object
BEGIN
  INSERT INTO file_search_idx(file_search_idx, rowid, original_name, extension, mime_type)
  VALUES ('delete', OLD.id, OLD.original_name, OLD.extension, OLD.mime_type);
END;

CREATE TRIGGER IF NOT EXISTS file_search_update AFTER UPDATE ON file_object
BEGIN
  INSERT INTO file_search_idx(file_search_idx, rowid, original_name, extension, mime_type)
  VALUES ('delete', OLD.id, OLD.original_name, OLD.extension, OLD.mime_type);
  INSERT INTO file_search_idx(rowid, original_name, extension, mime_type)
  VALUES (NEW.id, NEW.original_name, NEW.extension, NEW.mime_type);
END;
```

## Drizzle Schema (TypeScript)

```ts
// packages/shared/src/db/schema/search.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// FTS5 is a virtual table - managed via migration SQL, not Drizzle schema
// The Drizzle schema represents the data table that FTS5 indexes
export const fileObject = sqliteTable("file_object", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  originalName: text("original_name").notNull(),
  extension: text("extension"),
  mimeType: text("mime_type"),
  // ... other fields
})
```

---

# Query Implementation

## Basic Full-Text Search

```ts
// apps/api/src/services/search.service.ts
import { db } from "../db"

export async function searchFiles(
  workspaceId: string,
  query: string,
  filters: SearchFilters,
  page: number,
  limit: number,
) {
  const offset = (page - 1) * limit

  const results = await db.all(`
    SELECT f.*
    FROM file_object f
    INNER JOIN file_search_idx fs ON f.id = fs.rowid
    WHERE file_search_idx MATCH ?
      AND f.workspace_id = ?
      AND f.is_deleted = 0
      ${filters.type ? "AND f.mime_type LIKE ?" : ""}
      ${filters.tagIds?.length ? "AND f.id IN (SELECT file_object_id FROM file_object_tag WHERE tag_id IN (?))" : ""}
      ${filters.favorite ? "AND f.id IN (SELECT file_object_id FROM favorite WHERE user_id = ?)" : ""}
    ORDER BY rank
    LIMIT ? OFFSET ?
  `, [
    buildFtsQuery(query),
    workspaceId,
    /* other params */
    limit,
    offset,
  ])

  return results
}
```

## Query Builder Helper

```ts
function buildFtsQuery(raw: string): string {
  // Sanitize and tokenize the input
  const tokens = raw
    .trim()
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\s.\-_]/g, "")
    .split(/\s+/)
    .filter(t => t.length > 0)
    .map(t => `"${t}"`)
    .join(" OR ")

  return tokens || "*"
}
```

---

# Filters

Search supports layered filtering on top of text search:

## Mime Type Categories

```ts
const mimeCategories = {
  documents: ["application/pdf", "text/", "application/msword",
              "application/vnd.openxmlformats", "application/vnd.ms-"],
  images: ["image/"],
  videos: ["video/"],
  audio: ["audio/"],
  archives: ["application/zip", "application/x-rar", "application/gzip",
             "application/x-tar", "application/x-7z-compressed"],
}

export function buildMimeFilter(category: string): string {
  if (category === "all" || !mimeCategories[category]) return ""
  return mimeCategories[category].map(prefix => `f.mime_type LIKE '${prefix}%'`).join(" OR ")
}
```

## Tag Filter

Filter by one or more tags (AND logic):
```sql
AND f.id IN (
  SELECT fot.file_object_id
  FROM file_object_tag fot
  WHERE fot.tag_id IN (?, ?, ?)
  GROUP BY fot.file_object_id
  HAVING COUNT(DISTINCT fot.tag_id) = ?  -- all specified tags must match
)
```

## Favorite Filter

If `favorite: true`, only return files the current user has favorited:
```sql
AND f.id IN (SELECT file_object_id FROM favorite WHERE user_id = ?)
```

## Date Range

Filter by creation/modification date:
```sql
AND f.created_at >= ?
AND f.created_at <= ?
```

---

# Sorting

Search results are sorted by FTS5 relevance rank by default.

Users can override with:
- `name` — alphabetical
- `created_at` — newest/oldest first
- `size` — largest/smallest first

When a non-relevance sort is selected, the FTS5 rank is used as a secondary sort
within results that match the primary sort key.

---

# Performance Considerations

## Indexing

```sql
-- Required indexes for search performance
CREATE INDEX IF NOT EXISTS idx_file_workspace ON file_object(workspace_id);
CREATE INDEX IF NOT EXISTS idx_file_deleted ON file_object(is_deleted);
CREATE INDEX IF NOT EXISTS idx_file_mime ON file_object(mime_type);
CREATE INDEX IF NOT EXISTS idx_file_created ON file_object(created_at);
CREATE INDEX IF NOT EXISTS idx_favorite_user ON favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_file ON file_object_tag(file_object_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_tag ON file_object_tag(tag_id);
```

## Virtualization

Search results use the same virtualization as the file explorer.
If 10,000 results match, only the visible rows (~50) render DOM nodes.

## Caching

TanStack Query caches search results:
- Cache key: `["search", workspaceId, query, JSON.stringify(filters)]`
- Stale time: 30 seconds (search results change as files are modified)
- Background refetch on window focus for freshness

## Pagination

All search results are paginated. Default: 25 items per page, max 100.

---

# UI Behavior

## Search Input

- Global shortcut: `Ctrl/Cmd + F` or `Ctrl/Cmd + K` (command palette)
- Input auto-focuses on activation
- Search bar at the top of the explorer area
- Clear button (X) visible when input has text
- Esc clears the search and returns to browsing

## Search Context Display

When search is active, the explorer shows:
- An info bar: `Results for "quarterly report" — 42 files`
- Active filter chips: `[PDF] [Design] [Favorites]` with X to remove
- Sort dropdown next to the info bar

## Empty State

When search returns no results:
- Icon + "No files match your search"
- Suggestion: "Try different keywords or remove filters"
- Action: "Clear search" button

---

# Future Enhancements

- **Content search**: full-text extraction from PDF, Office documents (via worker job)
- **OCR search**: extract text from images for searchability (via worker job)
- **Semantic search**: vector embeddings for meaning-based search (requires external index)
- **Search suggestions**: autocomplete based on previous searches or popular files
- **Saved searches**: users can save frequent search queries as "smart folders"

For the initial release, file name and metadata search via FTS5 is sufficient.
The architecture allows upgrading to Meilisense or Typesense later if scale demands it.

---

# References

- [SQLite FTS5 Documentation](https://www.sqlite.org/fts5.html)
- [Cloudflare D1 Full-Text Search](https://developers.cloudflare.com/d1/build-with-d1/query-d1/#full-text-search)
- [API Contracts — Search Endpoint](../architecture/api-contracts.md#search)
- [Frontend Interactions — Search UX](interactions.md#search-interactions)
