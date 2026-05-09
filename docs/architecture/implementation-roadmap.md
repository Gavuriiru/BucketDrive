# Implementation Roadmap

Step-by-step guide organized by daily sessions. Each step is self-contained and ends with a
verifiable result.

> **Status tracking:** This file is updated after each day's implementation. Completed days
> are marked with ✅ and the section is updated with notes on actual changes made.

## Status Overview

| Day | Topic | Core Deliverable | Status |
|---|---|---|---|
| 1 | Database | Schema migrated, seed data | ✅ `59d3ea2` |
| 2 | Auth backend | GitHub OAuth working via Better Auth | ✅ `f4f650e` |
| 3 | Auth frontend | Login page, session guard, user context | ✅ `4b78970` |
| 4 | Storage | R2 provider with signed URLs | ✅ `101668b` |
| 5 | Upload | End-to-end drag-drop upload with progress | ✅ `8f0d0c2` |
| 6 | Explorer | Grid/list views with breadcrumbs | ✅ |
| 7 | Interactions | Context menus, keyboard shortcuts, multi-select | ✅ |
| 8 | Folders | CRUD, folder tree, drag-drop move | ✅ |
| 9 | RBAC | Permission engine with can() checks | ✅ |
| 10 | Internal shares | File sharing between workspace members | ⬜ |
| 11 | External shares | Public links with password + rate-limit | ⬜ |
| 12 | Share management | User dashboard + admin oversight | ⬜ |
| 13 | Trash | Soft delete, restore, auto-cleanup | ⬜ |
| 14 | Search | FTS5 full-text with filters | ⬜ |
| 15 | Tags & favorites | Color-coded tags, star favorites | ⬜ |
| 16 | Command palette | Ctrl+K with search + commands | ⬜ |
| 17 | Preview | Space to preview files inline | ⬜ |
| 18 | Dark mode | Theme toggle, system detection | ⬜ |
| 19 | Dashboard | Admin analytics + settings | ⬜ |
| 20 | Testing | Contracts, units, a11y, staging deploy | ⬜ |

---

## Day 1 — Database Foundation & Migration ✅ (`59d3ea2`)

> **Notes from implementation:**
> - Fixed FK bug in `tags.ts`: `fileObjectId` referenced `workspace.id` instead of `fileObject.id`
> - Replaced `better-sqlite3` with `sql.js` in scripts (WSL2 platform compatibility)
> - Added `tsx`, `sql.js`, `uuid` as root devDependencies
> - Updated `turbo.json` `pipeline` → `tasks` for Turbo v2 compat
> - `db:studio` requires `@libsql/client` which is ESM-only (not critical)


**Goal:** Database schema generated, migrated, and working locally.

### Step 1.1 — Generate initial migration

```bash
# From repo root
pnpm db:generate
```

This reads `packages/shared/src/db/schema/` and generates SQL in `packages/shared/src/db/migrations/`.

Verify: a `0000_init.sql` file appears in the migrations folder.

### Step 1.2 — Apply migration to local SQLite

```bash
# From repo root
pnpm db:migrate:dev
pnpm db:seed
```

This creates `apps/api/.db/local.sqlite` and seeds it with sample data.

Verify: run `pnpm db:studio` and open http://localhost:4983. You should see tables with seeded data.

### Step 1.3 — Commit

```bash
git add -A && git commit -m "chore(db): initial migration and seed"
```

---

## Day 2 — Authentication (Better Auth) ✅

> **Notes from implementation:**
> - Installed `@better-auth/drizzle-adapter` as explicit dependency (imported from `better-auth/adapters/drizzle` re-exports it)
> - Created `packages/shared/src/db/schema/auth.ts` with `user`, `session`, `account`, `verification`, `organization`, `member` tables
> - Added `workspaceMember` junction table for future RBAC
> - Better Auth v1.x uses `POST /api/auth/sign-in/social` (not `GET /signin/github` as in v0.x)
> - D1 Miniflare simulator rejects JavaScript Date objects — added D1 binding wrapper in `db.ts` that serializes Dates to ISO strings
> - `migrations_dir` added to `wrangler.toml` for D1 local dev; migrations applied via `wrangler d1 execute`
> - `.dev.vars` must be in the same directory as `wrangler.toml` (repo root) to be picked up by Wrangler
> - OAuth flow fully functional: sign-in returns GitHub auth URL, callback route active, session endpoint returns null when unauthenticated
> - Auth middleware returns 401 on protected routes without a valid session

### Step 2.1 — Create GitHub OAuth App

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `http://localhost:8787`
3. Callback URL: `http://localhost:8787/api/auth/callback/github`
4. Copy Client ID and Client Secret

### Step 2.2 — Create `.dev.vars` file

```bash
# apps/api/.dev.vars
BETTER_AUTH_SECRET=your-generated-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

Generate a secret: `openssl rand -base64 64`

### Step 2.3 — Test auth locally

```bash
# From repo root
cd apps/api && npx wrangler dev
```

Open `http://localhost:8787/api/auth/signin/github` in the browser.
It should redirect to GitHub OAuth, authenticate, and redirect back.

Verify: the `/api/auth/session` endpoint returns user data.

### Step 2.4 — Wire up `apps/api/src/middleware/auth.ts`

The middleware is stubbed. Verify it works by hitting a protected route like
`GET /api/workspaces/:id/files` with the session cookie. Should return empty data (not 401).

### Step 2.5 — Commit

```bash
git commit -m "feat(auth): verify Better Auth OAuth flow with GitHub"
```

---

## Day 3 — Login UI (Frontend) ✅

> **Notes from implementation:**
> - Created `apps/web/src/lib/auth.ts` with `useSession()` hook (TanStack Query) and `useSignOut()` hook
> - Created `apps/web/src/routes/login.tsx` with GitHub OAuth sign-in link (`GET /api/auth/sign-in/social?provider=github&callbackURL=/dashboard`)
> - Restructured `__root.tsx` routes: root `<Outlet />`, standalone `/login` route (redirects to `/dashboard` if already authenticated), `app` layout route with `beforeLoad` auth guard, `/` and `/dashboard` as children
> - Updated `topbar.tsx` to show user avatar/initials + name from session, sign-out button, wired theme toggle to Zustand store
> - Fixed pre-existing `no-confusing-void-expression` lint errors in `app-store.ts`
> - Added `defaultPendingComponent` spinner shown while session is being checked
> - Installed missing ESLint dependencies (`eslint`, `@eslint/js`, `typescript-eslint`, `globals`) that were configured but not in lockfile
> - Better Auth v1.x social sign-in endpoint: `GET /api/auth/sign-in/social?provider=github` (not the old `/api/auth/signin/github` from roadmap v0.x)
> - `@/` path alias imports from ESLint strict type-checked config trigger false positives on generic hook returns; suppressed with file-level disable in topbar.tsx

### Step 3.1 — Create login page

Create `apps/web/src/routes/login.tsx`:
- "Sign in with GitHub" button that links to `/api/auth/signin/github`
- Clean centered layout with BucketDrive branding

### Step 3.2 — Add auth context

Create `apps/web/src/lib/auth.ts`:
- `useSession()` hook that fetches `/api/auth/session` and caches via TanStack Query
- Redirect to `/login` if unauthenticated
- Show user avatar + name in Topbar

### Step 3.3 — Protect dashboard route

Update `__root.tsx`:
- If no session, redirect to `/login`
- Show loading spinner while checking session

### Step 3.4 — Verify

```bash
cd apps/web && npx vite dev
```

1. Open http://localhost:5173
2. Should redirect to /login
3. Click "Sign in with GitHub" → OAuth flow → redirected to /dashboard
4. Topbar shows user avatar and name

### Step 3.5 — Commit

```bash
git commit -m "feat(web): login page and session-based auth guard"
```

---

## Day 4 — R2 Storage Provider ✅ (`101668b`)

> **Notes from implementation:**
> - Created `StorageProvider` interface with `generateSignedUploadUrl`, `generateSignedDownloadUrl`, `delete`, `copy`
> - Implemented `R2StorageProvider` using `aws4fetch` for S3-compatible presigned URLs (PUT/GET)
> - Added `R2BindingProvider` fallback when R2 S3 credentials are missing (presigned URLs disabled but delete/copy still work via R2 binding)
> - R2 S3 credentials loaded from env vars: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`
> - 8 unit tests passing with mocked R2Bucket and AwsClient
> - Upload contracts extended: `CompleteUploadRequest` now includes `fileName`, `mimeType`, `folderId`
> - All Drizzle queries use `await` (.all(), .get(), .run() return Promises in D1 driver)
> - Shared package `dist/` directory required rebuild after contract changes (`tsc` added as build script)
> - Workspaces handler (`GET /api/workspaces`) uses `workspaceMember` joined with `workspace` table

**Goal:** Files can be uploaded to R2 via signed URLs.

### Step 4.1 — Create R2 bucket

```bash
npx wrangler r2 bucket create bucketdrive-dev
```

### Step 4.2 — Implement StorageProvider

Create `apps/api/src/services/storage.ts` with `StorageProvider` interface:

```ts
interface StorageProvider {
  generateSignedUploadUrl(key: string, expiresIn?: number): Promise<string>
  generateSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  copy(fromKey: string, toKey: string): Promise<void>
}
```

Implement `R2StorageProvider`:
- Uses `c.env.STORAGE` (R2 bucket binding)
- `signedUploadUrl`: PUT, 15 min expiry
- `signedDownloadUrl`: GET, 15 min expiry
- `delete` + `copy`: delegate to R2 binding

### Step 4.3 — Write unit tests

Create `apps/api/src/services/__tests__/storage.test.ts`:
- Mock R2 binding
- Test signed URL generation
- Test error handling (missing bucket, missing key)

### Step 4.4 — Verify

Call `POST /api/workspaces/:id/files/upload` → should return `{ signedUrl, storageKey }`.

Upload a file with `curl -X PUT "<signedUrl>" --upload-file test.txt` → confirm in R2 dashboard.

### Step 4.5 — Commit

```bash
git commit -m "feat(storage): R2 storage provider with signed URLs"
```

---

## Day 5 — File Upload (End-to-End) ✅ (`8f0d0c2`)

> **Notes from implementation:**
> - Combined Day 4 (storage backend) + Day 5 (upload UI) into a single implementation session
> - Created `UploadService` with `initiateUpload()` (RBAC/quota/mime validation, signed URL, UploadSession) and `completeUpload()` (FileObject creation, audit log)
> - Files handler wired: `POST /upload`, `POST /upload/complete`, `GET /:fileId/download`, `GET /` (list with sorting/pagination)
> - Frontend upload via XHR with `upload.onprogress` for progress tracking
> - Upload queue: Zustand store with status tracking (queued/uploading/completed/failed/cancelled), floating drawer UI
> - Drag-and-drop zone with native HTML5 drag events (highlight on drag-over)
> - File list table with loading skeleton, empty state, icons per mime type
> - Dashboard extracted to own route file (`routes/app/dashboard.tsx`), loads workspace + files
> - Fixed auth flow: Better Auth v1.x uses `POST /api/auth/sign-in/social` with JSON body (not GET with query params), session endpoint is `GET /api/auth/get-session` (not `/session`), `checkAuth()` verifies `data?.user` not just `res.ok`
> - Google OAuth pending: `redirect_uri_mismatch` requires exact URI match in Google Cloud Console
> - Added `vitest` config for API unit tests

**Goal:** User drags a file into the browser, it uploads to R2, metadata is saved.

### Step 5.1 — Implement upload service

Create `apps/api/src/services/upload.service.ts`:
- `initiateUpload()`: validate RBAC + quota + mime, generate signed URL, create UploadSession
- `completeUpload()`: verify parts, save FileObject metadata, audit log
- `cancelUpload()`: abort R2 multipart, mark session cancelled

### Step 5.2 — Implement upload handlers

Update `apps/api/src/modules/files/files.handler.ts`:
- `POST /upload` → calls `initiateUpload`
- `POST /upload/complete` → calls `completeUpload`
- Add proper Zod validation using `InitiateUploadRequest` / `CompleteUploadRequest`

### Step 5.3 — Implement upload queue UI

Create `apps/web/src/components/features/upload-queue.tsx`:
- Zustand store for upload state: files, progress, status
- Drag-and-drop zone on file explorer area
- Upload queue drawer: filename, progress bar, speed, ETA
- Actions: pause, resume, cancel per file

### Step 5.4 — Verify

1. Drag a file from OS to browser explorer area
2. File appears in upload queue with progress
3. On completion, file appears in explorer

### Step 5.5 — Commit

```bash
git commit -m "feat: end-to-end file upload with progress"
```

---

## Day 6 — File Explorer (Grid & List Views)

> **Notes from implementation:**
> - Created `packages/shared/src/contracts/folders.ts` with `ListFoldersRequest`, `ListFoldersResponse`, `BreadcrumbItemSchema`, `BreadcrumbResponse`
> - Created `apps/api/src/modules/folders/folders.handler.ts` with `GET /` (list folders by parentFolderId) and `GET /:folderId/breadcrumbs` (walk parent chain to root)
> - Registered folders route at `apps/api/src/index.ts` → `/api/workspaces/:workspaceId/folders`
> - Updated seed to add 2 root-level files (welcome.txt, getting-started.pdf) alongside 5 in Documents folder (7 total)
> - Created `explorer-store.ts` (Zustand): viewMode (grid/list), currentFolderId, sort, order, navigateTo/ToRoot actions
> - Updated `useFiles` hook to accept sort/order/page/limit params; added `useFolders` and `useBreadcrumbs` hooks
> - Created `file-grid.tsx` — responsive card grid (2-6 columns) showing folders (FolderOpen icon) first, then files (emoji icons)
> - Created `breadcrumbs.tsx` — Home icon + workspace name + folder segments, clickable navigation
> - Updated `file-list.tsx` to accept folders array, show folders first (clickable), maintain FileObject rows below
> - Updated `dashboard.tsx` with breadcrumbs bar, grid/list toggle, folder navigation, combined files + folders display
> - `ListFoldersRequest` supports `parentFolderId` param; `parentFolderId=null` filters root-level folders

### Step 6.1 — Implement list files handler

Update `GET /api/workspaces/:id/files`:
- Query `FileObject` with workspace scope, folder filter, sort, pagination
- Return `ListFilesResponse` shape

### Step 6.2 — Create useFiles hook

Create `apps/web/src/hooks/api/use-files.ts`:
- TanStack Query hook with `queryKey: ["files", workspaceId, params]`
- Zod parse on response to validate contract

### Step 6.3 — Implement file explorer grid

Create `apps/web/src/components/features/file-explorer.tsx`:
- Fetches files from API
- Grid view: cards with icon thumbnail, filename, size, date
- List view: table with columns (name, type, size, modified)
- Toggle between views (zustand store `explorer-view`)
- Empty state: "No files yet — drag files here to upload"

### Step 6.4 — Add folder navigation breadcrumbs

Breadcrumb component showing current path:
- Clickable segments that navigate
- Root: workspace name

### Step 6.5 — Verify

1. Seed creates 5 sample files
2. Explorer shows them in grid view
3. Toggle to list view → table with columns
4. Breadcrumbs show path

### Step 6.6 — Commit

```bash
git commit -m "feat(explorer): grid and list views with breadcrumbs"
```

---

## Day 7 — Keyboard & Context Menus ✅

> **Notes from implementation:**
> - Added `RenameFileRequest` and `DeleteFileResponse` contracts to `packages/shared/src/contracts/files.ts`
> - Implemented `PATCH /:fileId` rename handler: updates `originalName` + `extension`, audit log `file.rename`
> - Implemented `DELETE /:fileId` soft-delete handler: sets `isDeleted=true, deletedAt=now()`, audit log `file.delete`
> - Expanded `explorer-store.ts` with selection state (`selectedFileIds`, `selectedFolderIds`), focus tracking (`focusedItemId`, `focusedItemType`), click tracking (`lastClickedItemId`, `lastClickedItemIndex`), clipboard support
> - Added selection actions: `selectItem`, `toggleSelect`, `selectRange`, `selectAll`, `clearSelection`, `setFocusedItem`
> - Created `use-explorer-shortcuts.ts` hook: arrow keys navigate grid/list, Enter opens, Delete trashes, Ctrl+A selects all, Ctrl+C/X copies/cuts, F2 renames, Escape clears selection
> - Created `file-context-menu.tsx` using `@radix-ui/react-context-menu` (already installed): right-click menu with Open, Download, Rename, Copy, Move, Share, Favorite, Delete per item type
> - Updated `file-grid.tsx`: items are `role="button" tabIndex={0}` with `data-item-*` attributes, click handlers with shift/ctrl modifiers, selected items get `ring-1 ring-accent bg-accent/10`, focused items get `ring-1 ring-border-muted`
> - Updated `file-list.tsx`: rows are interactive with same selection/focus visuals, `MoreVertical` button now opens `@radix-ui/react-dropdown-menu` with per-item actions
> - Wired `dashboard.tsx` with `useExplorerShortcuts`, bulk actions toolbar (shown when 2+ items selected), context menu callbacks for rename/delete/download
> - Added `useRenameFile` and `useDeleteFile` mutation hooks to `api.ts` with cache invalidation
> - Current limitations: Move/Copy/Share/Favorite actions are stubs (console.log or pending); folder operations (rename/delete) use file endpoint (folder CRUD comes in Day 8); no inline rename input yet (uses `window.prompt`)

### Step 7.1 — Implement context menu

Create `apps/web/src/components/features/file-context-menu.tsx`:
- Right-click on file → menu: Open, Rename, Move, Copy, Download, Share, Favorite, Delete
- Position-aware (doesn't overflow viewport)
- Keyboard: Shift+F10 or context menu key opens menu for selected file
- ESC closes menu

### Step 7.2 — Implement keyboard shortcuts

Create `apps/web/src/hooks/use-explorer-shortcuts.ts`:
- Enter = open file/enter folder
- Delete = trash selected
- Ctrl+A = select all
- Ctrl+C / Ctrl+X / Ctrl+V = copy / cut / paste
- F2 = rename
- Space = preview
- Arrow keys = navigate grid/list
- Shift+arrows = multi-select range
- Ctrl+click = toggle selection

### Step 7.3 — Implement multi-selection

- Click behavior: select item (deselect others)
- Shift+click: select range
- Ctrl/Cmd+click: toggle item in selection
- Selected items visual: accent border + subtle background
- Bulk actions toolbar appears when multi-selected: Delete, Move, Share, Download as ZIP

### Step 7.4 — Verify

1. Navigate files with arrow keys
2. Select multiple files with Shift+arrows
3. Right-click shows context menu with correct actions
4. Enter opens folder, Backspace goes back

### Step 7.5 — Commit

```bash
git commit -m "feat(explorer): keyboard navigation, context menus, multi-selection"
```

---

## Day 8 — Folder CRUD & Drag-Drop Move ✅

**Goal:** Users can create, rename, move, delete folders. Drag files between folders.

> **Notes from implementation:**
> - Added `CreateFolderRequest`, `UpdateFolderRequest`, `DeleteFolderResponse` contracts to `packages/shared/src/contracts/folders.ts`
> - Folder handler (`folders.handler.ts`): `POST /` creates folder with materialized path (`parent.path/name`), `PATCH /:folderId` handles rename + move (combined `UpdateFolderRequest` with `name` + `parentFolderId`, recalculates path), `DELETE /:folderId` does recursive soft-delete (collects all descendant folders iteratively, marks files + folders as `isDeleted=true` in batch)
> - File handler (`files.handler.ts`): switched `PATCH /:fileId` from `RenameFileRequest` to `UpdateFileRequest` which already had `folderId` — supports rename AND move in one call; audit log differentiates `file.move` vs `file.rename`
> - Frontend hooks in `api.ts`: `useCreateFolder`, `useUpdateFolder`, `useDeleteFolder`, `useMoveFile` — all invalidate both `["files"]` and `["folders"]` query caches
> - Fixed pre-existing bug: dashboard `handleRenameItem` and `handleDeleteSelected` now route to correct mutation by item type (file vs folder) instead of always using file mutations
> - Added "New Folder" button in explorer toolbar (next to Upload), creates folder in current directory via `useCreateFolder`
> - Wired `onMove` context menu action through FileGrid/FileList → dashboard; prompts for destination folder ID via `window.prompt`
> - Folder tree sidebar (`folder-tree.tsx`): renders below static nav links in Sidebar, uses `useFolders(wsId, null)` for root ↦ lazy-loads children on expand, chevron collapse/expand, highlights current folder, right-click context menu (New Subfolder, Rename, Delete), "All Files" root navigator
> - Drag-to-move with `@dnd-kit/core` (already installed): `DndContext` wraps explorer area in dashboard, `useDraggable` on file/folder items, `useDroppable` on folder items (files aren't drop targets), `DragOverlay` shows item name while dragging, dragged items get `opacity-50`, drop targets get `bg-accent/10` highlight, `onDragEnd` parses `folder-{id}` / `file-{id}` IDs and calls `useMoveFile` or `useUpdateFolder`
> - FileGrid/FileList refactored: extracted `FolderGridCard`/`FileGridCard` and `FolderListRow`/`FileListRow` sub-components with `useDraggable`+`useDroppable` hooks; removed explicit `role`/`tabIndex` that conflicted with `@dnd-kit` attributes

**Goal:** Users can create, rename, move, delete folders. Drag files between folders.

### Step 8.1 — Implement folder handlers

Update `apps/api/src/modules/folders/folders.handler.ts`:
- `POST /` — create folder
- `PATCH /:id` — rename/move folder
- `DELETE /:id` — soft-delete folder (recursive)

### Step 8.2 — Implement folder tree sidebar

Update sidebar to show folder tree:
- Expandable/collapsible
- Current folder highlighted
- Click to navigate
- Right-click folder: New Folder, Rename, Move, Delete

### Step 8.3 — Implement drag-to-move

Using `@dnd-kit`:
- Drag file to folder → drop target highlights
- On drop → API call to move file
- Optimistic update: file disappears from source, appears in target
- If API fails → rollback

### Step 8.4 — Verify

1. Create a new folder: right-click → New Folder → type name → Enter
2. Navigate into folder (double-click or Enter)
3. Drag a file from one folder to another
4. File moves (optimistic) and persists on reload

### Step 8.5 — Commit

```bash
git commit -m "feat: folder CRUD, folder tree, drag-drop to move"
```

---

## Day 9 — RBAC Engine ✅

**Goal:** Permission system enforces access control.

> **Notes from implementation:**
> - Created `packages/shared/src/rbac/permissions.ts` with `Permission` Zod enum (30 permissions) and `ROLE_PERMISSIONS` mapping per role
> - Created `packages/shared/src/rbac/can.ts` with `can(role, permission, resourceOwnerId?, userId?)` — pure function, no DB dependency
> - Owner: all permissions; Admin: all except workspace.delete/transfer; Editor: read, upload, rename, move, copy, share, tag, favorite + shares management (NOT delete); Viewer: read only
> - Ownership override: editors can delete/restore their own files/folders even though the role doesn't include those permissions
> - Updated `apps/api/src/middleware/rbac.ts`: queries `workspaceMember` for the user's role, calls `can()`, returns 403 `FORBIDDEN` if denied, 403 `WORKSPACE_ACCESS_DENIED` if not a member
> - Fixed `folders.handler.ts`: changed GET / and GET /:folderId/breadcrumbs from `requirePermission("files.read")` to `requirePermission("folders.read")`
> - 19 unit tests in `packages/shared/src/rbac/__tests__/can.test.ts` — all passing
> - Seed now creates 4 members (owner, admin, editor, viewer) for multi-role testing
> - Added `vitest` devDependency and `test:unit` script to shared package

### Step 9.1 — Implement permission engine

Create `packages/shared/src/rbac/can.ts`:

```ts
export function can(
  role: WorkspaceRole,
  permission: Permission,
  resourceOwnerId?: string,
  userId?: string,
): boolean
```

Define permission sets per role:
- `owner`: all permissions
- `admin`: all except transfer-ownership, delete-workspace
- `editor`: read, write, rename, move, share, tag, favorite
- `viewer`: read only

### Step 9.2 — Implement middleware

Update `apps/api/src/middleware/rbac.ts`:
- `requirePermission(permission)`: middleware that fetches user's role from D1 and calls `can()`
- Workspace-scoped: ensures user is member of target workspace

### Step 9.3 — Add RBAC to all protected routes

Wire `requirePermission()` into every handler:
- Files: `files.read`, `files.upload`, `files.delete`, `files.restore`
- Folders: `folders.read`, `folders.create`, `folders.delete`
- Shares: `shares.create`, `shares.read`, `shares.revoke`

### Step 9.4 — Write RBAC tests

Create `packages/shared/src/rbac/__tests__/can.test.ts`:
- Each role × each permission → assert correct result
- Ownership: file owner can always read their own files
- Cross-workspace: viewer in A cannot access files in B

### Step 9.5 — Verify

1. Create 2 users with different roles in same workspace
2. Viewer tries `PATCH /files/:id` → returns 403
3. Editor tries `DELETE /workspace/:id` → returns 403
4. Admin tries `POST /shares` → returns 200

### Step 9.6 — Commit

```bash
git commit -m "feat(rbac): permission engine with role-based middleware"
```

---

## Day 10 — Internal Sharing

**Goal:** Users can share files/folders with other workspace members.

### Step 10.1 — Implement share creation

Update `apps/api/src/modules/shares/shares.handler.ts`:
- `POST /` → create ShareLink with permissions (read, edit)
- Validate user has `shares.create` permission
- Store in D1

### Step 10.2 — Implement share access

When a shared user accesses the resource:
- Check ShareLink exists, is active, and user is a workspace member
- Grant access based on share permissions

### Step 10.3 — Implement share UI

Create share modal:
- "Share" button in context menu / toolbar
- Modal: select user(s) from workspace member list
- Choose permission: Read, Edit
- Confirm → creates share

### Step 10.4 — Implement share inbox

Sidebar: "Shared with me" section showing files others shared with this user.

### Step 10.5 — Verify

1. User A shares a file with User B (read-only)
2. User B sees file in "Shared with me"
3. User B can read/download but cannot rename/delete

### Step 10.6 — Commit

```bash
git commit -m "feat(shares): internal file sharing between workspace members"
```

---

## Day 11 — External Sharing

**Goal:** Anyone with a link can view/download shared files (optional password).

### Step 11.1 — Implement external share creation

- `POST /shares` with `shareType: "external_direct"` or `"external_explorer"`
- Optional password: hash with bcrypt, store `passwordHash`
- Optional expiration: store `expiresAt`

### Step 11.2 — Implement public share gateway

Create `apps/api/src/modules/shares/public.handler.ts`:
- `POST /api/shares/:shareId/access` — validate password, check expiration, check locked status
- Log access attempt in `ShareAccessAttempt`
- Return signed download URL (direct) or folder contents (explorer)

### Step 11.3 — Implement brute-force protection

- Max 5 failed attempts per IP per 15 minutes
- After 10 total failures → lock share for 30 minutes
- Lock auto-expires

### Step 11.4 — Create public share page

Create `apps/web/src/routes/share.$shareId.tsx`:
- No auth required (public route)
- If password-protected: show password input
- If direct share: show file info + download button
- If explorer share: show read-only file browser (no upload/delete)

### Step 11.5 — Verify

1. Create external share with password "test123"
2. Open link in incognito → prompts for password
3. Enter correct password → file downloads
4. Enter wrong password 6 times → rate-limited
5. Wait 15 min → can try again

### Step 11.6 — Commit

```bash
git commit -m "feat(shares): external sharing with password and rate limiting"
```

---

## Day 12 — Share Management Dashboard

**Goal:** Users manage their shares; admins manage all workspace shares.

### Step 12.1 — User share page

Create `/dashboard/shares`:
- Table: file/folder name, share type, created date, expiration, access count
- Actions: copy link, change password, edit expiration, revoke
- Revoke confirmation: "This will immediately disable access. Continue?"

### Step 12.2 — Admin share overview

Admins see "All Workspace Shares" tab:
- All shares across all users
- Can revoke any share
- Can see locked shares (brute-force detection)

### Step 12.3 — Audit events

Ensure share actions generate audit logs:
- `share.created`, `share.accessed`, `share.revoked`, `share.password_failed`, `share.locked`

### Step 12.4 — Verify

1. User creates 3 shares → sees them on dashboard
2. Admin sees 3 shares + 2 from other users
3. Admin revokes one → share immediately disabled
4. External user opens revoked link → "Link no longer available"

### Step 12.5 — Commit

```bash
git commit -m "feat(shares): management dashboard with admin oversight"
```

---

## Day 13 — Trash System

**Goal:** Deleted files go to trash, can be restored within retention period.

### Step 13.1 — Implement soft-delete

Update delete handlers:
- `DELETE /files/:id` → sets `is_deleted = true, deleted_at = NOW()`
- File remains in R2
- Active shares invalidated
- File removed from explorer, appears in trash

### Step 13.2 — Implement trash view

Create "Trash" route in sidebar:
- Lists deleted files with: name, original location, deleted date, days remaining
- Actions: Restore, Delete Permanently

### Step 13.3 — Implement restore flow

- `POST /files/:id/restore` → sets `is_deleted = false`
- Returns to original folder if still exists, otherwise root
- Name conflict: append " (restored)" or number

### Step 13.4 — Implement permanent purge

- `DELETE /files/:id/permanent` → removes from R2 + hard-deletes DB row
- Confirmation modal required

### Step 13.5 — Verify

1. Delete a file → appears in trash with 30 days remaining
2. Restore it → appears in original folder
3. Delete permanently → file gone from R2 and DB

### Step 13.6 — Commit

```bash
git commit -m "feat(trash): soft delete, restore, and permanent purge"
```

---

## Day 14 — Search & Filters

**Goal:** Users search files by name, filter by type/tags/favorites.

### Step 14.1 — Create FTS5 index

Create migration `0001_fts_search.sql`:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS file_search_idx USING fts5(
  original_name, extension, mime_type,
  content = 'file_object', content_rowid = 'id'
);
```

### Step 14.2 — Implement search endpoint

- `GET /api/workspaces/:id/search?q=report&type=documents&favorite=true`
- Query FTS5 with filters, pagination
- Return `SearchResponse` shape

### Step 14.3 — Implement search UI

- Search bar in topbar (already stubbed)
- Debounced input (300ms)
- Results replace explorer content
- Filter chips: [Documents] [Images] [Favorites] [Tag: Review]
- Sort dropdown: Relevance, Name, Date, Size
- Empty state: "No results — try different keywords"

### Step 14.4 — Verify

1. Seed creates files with known names
2. Type "budget" → shows budget-2025.xlsx
3. Filter by images → shows team-photo.png
4. Clear search → returns to file explorer

### Step 14.5 — Commit

```bash
git commit -m "feat(search): FTS5 full-text search with filters"
```

---

## Day 15 — Tags, Favorites & Colors

**Goal:** Users can tag files, favorite them, and see visual organization.

### Step 15.1 — Implement tag CRUD

- `POST /tags` → create tag (name, color)
- `PATCH /tags/:id` → update
- `DELETE /tags/:id` → delete (removes from all files)

### Step 15.2 — Implement file tagging

- `POST /files/:id/tags` → `{ tagIds: [...] }` — replaces all tags for file
- Tag chips shown on file cards (grid) and as column (list)
- Colors from tag: chip background is `tag.color`

### Step 15.3 — Implement favorites

- `POST /files/:id/favorite` → toggle
- Star icon on file card/grid
- Filter: "Show favorites" toggle

### Step 15.4 — Create tag picker UI

- Dropdown: search/create tags
- Color picker for new tags
- Multi-select with checkboxes

### Step 15.5 — Verify

1. Create tag "Important" with red color
2. Tag a file → red chip appears on file card
3. Favorite a file → star icon appears
4. Filter search by favorite → only favorited files shown

### Step 15.6 — Commit

```bash
git commit -m "feat: tags, favorites, and color-coded organization"
```

---

## Day 16 — Command Palette

**Goal:** Ctrl+K opens command palette with all available actions.

### Step 16.1 — Implement command palette component

Create `apps/web/src/components/shared/command-palette.tsx`:
- `Ctrl/Cmd + K` toggle
- Search input with debounce
- Results: commands grouped by category
- Keyboard: ↑↓ select, Enter execute, Esc close
- Animations: fade + scale (150ms)

### Step 16.2 — Define all commands

Create `apps/web/src/components/shared/commands/`:
- `navigation.ts`: Go to Files, Go to Shares, Go to Trash, Go to Settings
- `file-operations.ts`: Rename, Move, Copy, Delete, Share, Favorite, Tag
- `appearance.ts`: Toggle dark mode, Switch grid/list view

### Step 16.3 — Wire up keyboard handlers

- Ctrl+K always opens palette (global listener)
- Esc always closes palette
- Focus returns to previously focused element on close

### Step 16.4 — Verify

1. Press Ctrl+K → palette opens
2. Type "dark" → "Toggle dark mode" appears
3. Press Enter → theme toggles
4. Press Ctrl+K → type "files" → Press Enter → navigates to files
5. Esc → palette closes, focus restored

### Step 16.5 — Commit

```bash
git commit -m "feat: command palette with search and keyboard navigation"
```

---

## Day 17 — Inline Preview (Space)

**Goal:** Press Space to preview file contents without leaving the explorer.

### Step 17.1 — Implement preview panel

Create `apps/web/src/components/features/file-preview.tsx`:
- Slide-in panel (right side, 400px)
- Shows based on mime type:
  - Images: rendered directly
  - PDF: embedded viewer
  - Video: HTML5 player
  - Markdown: rendered
  - Code: syntax-highlighted
  - Unknown: metadata card (size, type, date)
- Left/Right arrows: navigate between files
- Esc: close preview

### Step 17.2 — Implement preview API

- `GET /api/workspaces/:id/files/:fileId/preview` → returns signed URL for preview
- Short-lived (5 min), scope: read-only

### Step 17.3 — Verify

1. Select a file in explorer
2. Press Space → preview panel opens on the right
3. Image shows directly in the panel
4. Press Right arrow → next file's preview loads
5. Press Esc → preview closes, focus back to explorer

### Step 17.4 — Commit

```bash
git commit -m "feat(preview): inline file preview with arrow navigation"
```

---

## Day 18 — Dark Mode Toggle

**Goal:** Users can switch between light and dark themes.

### Step 18.1 — Implement theme toggle

The dark mode foundation already exists in `globals.css` with `.dark` class.
Wire up the toggle:
- Button in Topbar (sun/moon icon)
- Zustand store `theme` state (already stubbed)
- Persist preference in localStorage
- Respect `prefers-color-scheme` for default

### Step 18.2 — Verify all components

Go through every component and fix dark mode issues:
- Text contrast, border visibility
- Shadows adjusted for dark backgrounds
- Focus rings visible in both modes

### Step 18.3 — Commit

```bash
git commit -m "feat(theme): dark/light mode toggle with system preference"
```

---

## Day 19 — Admin Dashboard

**Goal:** Workspace owners/admins see analytics and manage settings.

### Step 19.1 — Implement dashboard API

- `GET /api/workspaces/:id/dashboard/overview`: user count, storage trends, active shares count, recent activity
- `GET /api/workspaces/:id/dashboard/audit`: filtered audit log
- `GET /api/workspaces/:id/dashboard/settings`: workspace settings
- `PATCH /api/workspaces/:id/dashboard/settings`: update settings

### Step 19.2 — Create dashboard UI

- Stats cards: total files, users, storage used, active shares
- Chart: storage usage over time (simple bar chart)
- Largest files table
- Settings form: quotas, allowed mime types, retention days

### Step 19.3 — Verify

1. Owner logs in → sees dashboard with stats
2. Viewer logs in → dashboard link hidden (no permission)
3. Owner changes quota → uploads respect new limit

### Step 19.4 — Commit

```bash
git commit -m "feat(dashboard): admin analytics and workspace settings"
```

---

## Day 20 — Testing & Polish

**Goal:** Tests pass, UI feels polished, ready for staging.

### Step 20.1 — Write contract tests

Create `apps/api/src/__tests__/contracts/`:
- Files: list, upload, download, update, delete, restore
- Shares: create, access, revoke
- Search: basic query, filters, empty results
- Auth: required error for each protected endpoint

### Step 20.2 — Write unit tests

- RBAC: every role × every permission (from Day 9)
- Storage provider: signed URLs, delete, error cases
- Share validation: expired, locked, password, revoked

### Step 20.3 — Accessibility pass

- Run `@axe-core/playwright` on all pages
- Fix any violations
- Ensure skip-to-content link exists
- Verify tab order on explorer page

### Step 20.4 — Performance check

- `vite build` → analyze bundle size (< 500 kB JS total)
- Verify list virtualization works with 10,000 files (seed script)

### Step 20.5 — Staging deploy

```bash
# Create staging D1 database
npx wrangler d1 create bucketdrive-db-staging

# Apply migrations
pnpm db:migrate:staging

# Deploy worker
npx wrangler deploy --env staging

# Deploy frontend
npx wrangler pages deploy apps/web/dist --project-name bucketdrive --branch main
```

### Step 20.6 — Final commit

```bash
git commit -m "test: contract tests, unit tests, a11y fixes, staging deploy"
```

---

# Quick Reference

See [Status Overview](#status-overview) at the top of this file for the latest status of each day.
