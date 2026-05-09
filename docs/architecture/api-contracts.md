# API Contracts

# Purpose

This document defines the API contracts for the platform using **TypeScript + Zod** as the
source of truth. Contracts are shared between frontend and backend via `packages/shared`.

The contract system ensures:
- Type-safe API calls on the frontend (TanStack Query)
- Runtime validation on the backend (Hono + Zod middleware)
- Automatic type inference (no manual type duplication)
- Contract testing (validate that backend responses match schemas)

---

# Contract Design Philosophy

## Shared Package Structure

```txt
packages/shared/
  src/
    contracts/
      files.ts          # File endpoints
      folders.ts        # Folder endpoints
      shares.ts         # Share endpoints
      workspaces.ts     # Workspace endpoints
      users.ts          # User endpoints
      search.ts         # Search endpoints
      dashboard.ts      # Admin dashboard endpoints
      auth.ts           # Auth-related contracts (profile, session)
    schemas/
      common.ts         # Pagination, sorting, error schemas
      file.ts           # FileObject schemas
      folder.ts         # Folder schemas
      share.ts          # ShareLink schemas
      workspace.ts      # Workspace schemas
      user.ts           # User schemas
      tag.ts            # Tag schemas
    index.ts            # Re-exports everything
```

## Contract Format

Each contract is a Zod schema defining the request/response pair:

```ts
// packages/shared/src/contracts/files.ts
import { z } from "zod"
import { FileObjectSchema, PaginatedResponseSchema } from "../schemas"

// GET /api/workspaces/:workspaceId/files
export const ListFilesRequest = z.object({
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  sort: z.enum(["name", "created_at", "size", "type"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  view: z.enum(["grid", "list"]).default("grid"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const ListFilesResponse = PaginatedResponseSchema(FileObjectSchema)
```

---

# Common Schemas

## Pagination

```ts
// packages/shared/src/schemas/common.ts
export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})

export function PaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  })
}
```

## Error

```ts
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
})

export const errorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  SHARE_LOCKED: "SHARE_LOCKED",
  SHARE_EXPIRED: "SHARE_EXPIRED",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const
```

---

# Endpoint Catalog

## Files

### `GET /api/workspaces/:workspaceId/files`

List files in a workspace, optionally filtered by folder.

**Request**: `ListFilesRequest`
**Response**: `ListFilesResponse`
**Auth**: Required
**Permission**: `files.read`

### `POST /api/workspaces/:workspaceId/files/upload`

Initiate file upload. Returns signed upload URL.

**Request**:
```ts
export const InitiateUploadRequest = z.object({
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  checksum: z.string().optional(),
})
```

**Response**:
```ts
export const InitiateUploadResponse = z.object({
  uploadId: z.string().uuid(),
  signedUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  storageKey: z.string(),
})
```
**Auth**: Required
**Permission**: `files.upload`

### `POST /api/workspaces/:workspaceId/files/upload/complete`

Confirm upload completion.

**Request**:
```ts
export const CompleteUploadRequest = z.object({
  uploadId: z.string().uuid(),
  parts: z.array(z.object({
    partNumber: z.number().int().positive(),
    etag: z.string(),
    sizeBytes: z.number().int().positive(),
  })),
})
```

**Response**: `FileObjectSchema`
**Auth**: Required
**Permission**: `files.upload`

### `GET /api/workspaces/:workspaceId/files/:fileId/download`

Get signed download URL for a file.

**Request**: path params
**Response**:
```ts
export const DownloadUrlResponse = z.object({
  signedUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  fileName: z.string(),
})
```
**Auth**: Required
**Permission**: `files.read`

### `PATCH /api/workspaces/:workspaceId/files/:fileId`

Rename or move a file.

**Request**:
```ts
export const UpdateFileRequest = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
})
```
**Response**: `FileObjectSchema`
**Auth**: Required
**Permission**: `files.rename` / `files.move`

### `DELETE /api/workspaces/:workspaceId/files/:fileId`

Soft-delete a file (move to trash).

**Response**: `{ success: true }`
**Auth**: Required
**Permission**: `files.delete`

### `POST /api/workspaces/:workspaceId/files/:fileId/restore`

Restore a file from trash.

**Response**: `FileObjectSchema`
**Auth**: Required
**Permission**: `files.restore`

### `POST /api/workspaces/:workspaceId/files/:fileId/favorite`

Toggle favorite status.

**Response**: `{ favorited: boolean }`
**Auth**: Required
**Permission**: `files.favorite`

### `POST /api/workspaces/:workspaceId/files/:fileId/tags`

Add/remove tags from a file.

**Request**:
```ts
export const UpdateFileTagsRequest = z.object({
  tagIds: z.array(z.string().uuid()),
})
```
**Response**: `FileObjectSchema` (with tags)
**Auth**: Required
**Permission**: `files.tag`

---

## Folders

### `GET /api/workspaces/:workspaceId/folders`

List folders (for navigation tree, breadcrumbs).

### `POST /api/workspaces/:workspaceId/folders`

Create a folder.

### `PATCH /api/workspaces/:workspaceId/folders/:folderId`

Rename or move a folder.

### `DELETE /api/workspaces/:workspaceId/folders/:folderId`

Soft-delete a folder (move to trash, recursively includes contents).

### `GET /api/workspaces/:workspaceId/folders/:folderId/breadcrumbs`

Get breadcrumb path from root to folder.

---

## Shares

### `GET /api/workspaces/:workspaceId/shares`

List shares in a workspace.

### `POST /api/workspaces/:workspaceId/shares`

Create a share link.

**Request**:
```ts
export const CreateShareRequest = z.object({
  resourceId: z.string().uuid(),
  resourceType: z.enum(["file", "folder"]),
  shareType: z.enum(["internal", "external_direct", "external_explorer"]),
  password: z.string().min(4).max(128).optional(),
  expiresAt: z.string().datetime().optional(),
})
```

**Response**: `ShareLinkSchema`
**Auth**: Required
**Permission**: `shares.create`

### `PATCH /api/workspaces/:workspaceId/shares/:shareId`

Update share settings (password, expiration, active status).

### `DELETE /api/workspaces/:workspaceId/shares/:shareId`

Revoke a share link.

### `POST /api/shares/:shareId/access`

Public endpoint — validate password and get access token.

**Request**:
```ts
export const ShareAccessRequest = z.object({
  password: z.string().optional(),
})
```
**Response**: signed URL or explorer data
**Auth**: None (public)

---

## Search

### `GET /api/workspaces/:workspaceId/search`

Search files by name, tag, or mime type.

**Request**:
```ts
export const SearchRequest = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["all", "documents", "images", "videos", "audio", "archives"]).default("all"),
  tags: z.array(z.string().uuid()).optional(),
  favorite: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
```
**Response**: `PaginatedResponseSchema(FileObjectSchema)`
**Auth**: Required
**Permission**: `files.read`

---

## Tags

### `GET /api/workspaces/:workspaceId/tags`

List all tags in workspace.

### `POST /api/workspaces/:workspaceId/tags`

Create a tag.

### `PATCH /api/workspaces/:workspaceId/tags/:tagId`

Update tag (name, color).

### `DELETE /api/workspaces/:workspaceId/tags/:tagId`

Delete a tag.

---

## Workspace

### `GET /api/workspaces`

List workspaces the user belongs to.

### `GET /api/workspaces/:workspaceId`

Get workspace details.

### `GET /api/workspaces/:workspaceId/storage`

Get storage usage statistics.

**Response**:
```ts
export const StorageInfoResponse = z.object({
  totalBytes: z.number(),
  usedBytes: z.number(),
  trashBytes: z.number(),
  quotaBytes: z.number().nullable(),
  largestFiles: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    sizeBytes: z.number(),
  })).max(10),
  fileCount: z.number(),
  folderCount: z.number(),
})
```
**Auth**: Required
**Permission**: `files.read`

### `GET /api/workspaces/:workspaceId/members`

List workspace members with roles.

### `POST /api/workspaces/:workspaceId/members`

Invite a user to workspace.

### `PATCH /api/workspaces/:workspaceId/members/:memberId`

Update member role.

### `DELETE /api/workspaces/:workspaceId/members/:memberId`

Remove member from workspace.

---

## Dashboard (Admin)

### `GET /api/workspaces/:workspaceId/dashboard/overview`

Admin overview: user count, storage trends, active shares, recent activity.

### `GET /api/workspaces/:workspaceId/dashboard/shares`

All shares in workspace (admin view, includes all users' shares).

### `GET /api/workspaces/:workspaceId/dashboard/audit`

Audit log with filtering (actor, action, resource type, date range).

### `GET /api/workspaces/:workspaceId/dashboard/settings`

Get workspace settings.

### `PATCH /api/workspaces/:workspaceId/dashboard/settings`

Update workspace settings (quotas, features, branding).

---

## User

### `GET /api/auth/profile`

Get current user profile.

### `PATCH /api/auth/profile`

Update profile (name, avatar).

### `GET /api/auth/sessions`

List active sessions for current user.

### `DELETE /api/auth/sessions/:sessionId`

Revoke a specific session.

---

# Error Response Format

All errors follow this structure:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "File name is required",
  "details": {
    "field": "fileName",
    "constraint": "min_length"
  }
}
```

Error codes (from `packages/shared/src/schemas/common.ts`):
- `UNAUTHORIZED` — not authenticated
- `FORBIDDEN` — authenticated but lacks permission
- `NOT_FOUND` — resource does not exist
- `CONFLICT` — resource already exists (e.g., duplicate folder name)
- `VALIDATION_ERROR` — request failed Zod validation
- `RATE_LIMITED` — too many requests
- `QUOTA_EXCEEDED` — storage quota reached
- `SHARE_LOCKED` — share link locked due to brute-force
- `SHARE_EXPIRED` — share link has expired
- `INVALID_PASSWORD` — share password incorrect
- `INTERNAL_ERROR` — unexpected server error (sanitized, no stack traces)

---

# Usage on Frontend

```ts
// apps/web/src/hooks/api/use-files.ts
import { ListFilesRequest, ListFilesResponse } from "@bucketdrive/shared/contracts/files"
import { useQuery } from "@tanstack/react-query"

export function useFiles(workspaceId: string, params: z.infer<typeof ListFilesRequest>) {
  return useQuery({
    queryKey: ["files", workspaceId, params],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/files?${new URLSearchParams(params)}`)
      const data = await res.json()
      return ListFilesResponse.parse(data) // Runtime validation
    },
  })
}
```

The shared contract ensures that if the backend changes the response shape,
the frontend immediately fails validation in development, catching mismatches
before they reach production.

---

# Contract Testing

```ts
// Integration test (Vitest)
import { ListFilesResponse } from "@bucketdrive/shared/contracts/files"

test("GET /api/workspaces/:id/files returns valid response", async () => {
  const response = await worker.fetch("/api/workspaces/ws_123/files")
  const body = await response.json()

  // Zod validates the entire response shape at runtime
  expect(() => ListFilesResponse.parse(body)).not.toThrow()
})
```

---

# References

- [Zod Documentation](https://zod.dev/)
- [Hono Validation Middleware](https://hono.dev/docs/guides/validation)
- [System Overview](system-overview.md)
