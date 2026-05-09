# Trash System

# Purpose

This document defines the soft-delete, trash, and recovery system for files and folders.

The trash system enables:
- Accidental deletion recovery
- Audit trail preservation
- Time-based auto-cleanup
- Manual permanent purge for admins

---

# Core Principles

## 1. Soft Delete by Default

Files and folders are never immediately destroyed. Deletion sets `is_deleted = true`
and records `deleted_at`. The actual storage object remains in R2.

## 2. Retention Policy

Deleted items remain in trash for a configurable period (default: 30 days).
After retention expires, items are permanently purged by an automated cleanup job.

## 3. Recovery Preserves Metadata

Restoring a file preserves: tags, favorites, share links (if share still valid),
audit history, and ownership.

---

# Delete Flow

## File Deletion

```
User deletes file (keyboard Delete, context menu, or bulk action)
    ↓
DELETE /api/workspaces/:id/files/:fileId
    ↓
Backend validates: files.delete permission
    ↓
Backend soft-deletes:
  - UPDATE file_object SET is_deleted = 1, deleted_at = NOW()
  - File remains in R2 (storage object preserved)
  - Favorites referencing this file are soft-deleted
  - Active share links are marked inactive
    ↓
Audit log: "file.deleted" event
    ↓
Frontend removes file from explorer, shows in trash view
    ↓
Toast: "File moved to trash — available for 30 days"
```

## Folder Deletion

Deleting a folder recursively soft-deletes all contents:

```
DELETE /api/workspaces/:id/folders/:folderId
    ↓
Backend validates: folders.delete permission
    ↓
Backend executes in transaction:
  1. Soft-delete the folder
  2. Recursively soft-delete all subfolders
  3. Soft-delete all files within the folder tree
  4. Invalidate shares linked to affected resources
    ↓
Audit logs: one event per resource type (folder.deleted, file.deleted)
```

---

# Trash View

Dedicated section in the file explorer showing deleted items.

## UI Behavior

- Accessible from sidebar: "Trash" with trash icon
- Shows: file/folder name, original location, deleted date, days remaining
- Sorting: by deleted date (default newest first), name, size, original location
- Empty state: "Trash is empty — deleted files will appear here for 30 days"
- Search within trash: filters deleted items by name

## Trash Item Actions

| Action | Permission | Description |
|---|---|---|
| **Restore** | `files.restore` | Returns file to original folder (or root if folder deleted) |
| **Delete Permanently** | `files.delete` (owner/admin) | Hard-deletes file from DB and R2 immediately |
| **Empty Trash** | `files.delete` (owner/admin) | Permanently deletes ALL items in trash |

---

# Restore Flow

```
User restores file from trash
    ↓
POST /api/workspaces/:id/files/:fileId/restore
    ↓
Backend validates: files.restore permission
    ↓
Backend validates: file is in trash (is_deleted = true)
    ↓
Backend checks: original folder still exists and user can write to it
    ↓
If original folder deleted: file restored to workspace root
    ↓
Backend restores:
  - UPDATE file_object SET is_deleted = 0, deleted_at = NULL
  - UPDATE folder_id to valid target
  - Reactivate favorites referencing this file
  - Share links remain inactive (must be manually reactivated)
    ↓
Audit log: "file.restored" event
    ↓
File appears in original location (or root)
    ↓
Toast: "File restored to [folder name]"
```

---

# Permanent Purge (Manual)

```
Owner/Admin clicks "Delete Permanently" on a trash item
    ↓
Confirmation modal: "This action is irreversible. Type DELETE to confirm."
    ↓
DELETE /api/workspaces/:id/files/:fileId/permanent
body: { confirmation: "DELETE" }
    ↓
Backend validates: actor is owner or admin
    ↓
Backend hard-deletes:
  - DELETE file_object row from DB
  - DELETE related favorites, tags, share links, audit log references
  - DELETE storage object from R2 (permanent, irreversible)
    ↓
Audit log: "file.permanently_deleted" event
    ↓
Toast: "File permanently deleted"
```

---

# Automatic Cleanup (Worker)

A scheduled Worker job runs daily to purge expired trash items.

```
CRON: every day at 03:00 UTC
    ↓
Worker queries:
  SELECT * FROM file_object
  WHERE is_deleted = 1
    AND deleted_at < datetime('now', '-30 days')
    ↓
For each expired file:
  1. Delete R2 storage object
  2. Hard-delete FileObject row
  3. Clean up related records (favorites, tags, share attempts)
  4. Write audit log entry: "file.auto_purged"
    ↓
Worker logs: "Purged {N} files from trash (auto-cleanup)"
```

The retention period (30 days) is configurable via `WorkspaceSettings.trashRetentionDays`.

---

# Edge Cases

## Restoring to a Deleted Folder

If the original parent folder was soft-deleted:
- Restore file to workspace root
- Toast: "Original folder was deleted — file restored to root"

If the original parent folder was permanently purged:
- Same behavior: restore to workspace root
- Log: "file.restored_to_root" (different event for analytics)

## Restoring with Name Conflict

If a file with the same name already exists in the target folder:
- Rename restored file: `report.pdf` → `report (restored).pdf` or `report (1).pdf`
- Toast: "File restored with updated name — original name was taken"

## Deleting Shared Files

If a file with active shares is deleted:
- Shares are immediately invalidated
- External users see "This share is no longer available"
- If file is restored, shares remain inactive (creator must reactivate)

## Disk Quota and Trash

Trash files count toward workspace storage quota.
Users must purge trash to free space for new uploads.

---

# Data Model Implications

## Soft Delete Fields

```txt
FileObject:
  is_deleted: boolean (default false)
  deleted_at: datetime (nullable)

Folder:
  is_deleted: boolean (default false)
  deleted_at: datetime (nullable)

Favorite:
  is_active: boolean (default true)  // deactivated when file deleted

ShareLink:
  is_active: boolean (default true)  // deactivated when resource deleted
```

## Queries Must Filter Deleted

All file/folder queries must include `WHERE is_deleted = 0` unless explicitly
querying the trash view.

```ts
// Correct: file explorer query
db.select().from(fileObject)
  .where(eq(fileObject.isDeleted, false))

// Correct: trash query
db.select().from(fileObject)
  .where(eq(fileObject.isDeleted, true))
```

---

# UI Components

## Trash Sidebar Item

```
[Trash icon] Trash  (12)
                        ↑ count of items in trash
```

## Trash View

```
┌─────────────────────────────────────────────┐
│ Trash                                        │
│ Items are kept for 30 days, then auto-purged │
│                                              │
│ [Empty Trash]    Search: [________]          │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Name          Location      Deleted   Days│ │
│ │ report.pdf    /Projects/     May 1    23  │ │
│ │ draft.docx    /Documents/    Apr 28   20  │ │
│ │ logo.png      /Assets/       Apr 15    7  │ │
│ └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Restore Success

```
Toast: ✓ "report.pdf restored to /Projects/"
```

## Permanent Delete Confirmation

```
Modal:
  ┌─────────────────────────────┐
  │ Delete Permanently?          │
  │                             │
  │ "report.pdf" will be        │
  │ permanently deleted.        │
  │ This cannot be undone.      │
  │                             │
  │ [Cancel]  [Delete Forever]  │
  └─────────────────────────────┘
```

---

# References

- [Data Model — Soft Delete Rules](../database/data-model.md#soft-delete-rules)
- [File Sharing — Deleting Shared Resources](file-sharing.md#deleting-shared-resources)
- [Upload System](upload-system.md)
- [Worker Jobs](../architecture/system-overview.md#apps/workers)
