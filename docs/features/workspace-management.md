# Workspace Management

# Purpose

This document defines the workspace lifecycle and management features.

Workspaces are the multi-tenant isolation unit. Every file, folder, share, and permission
is scoped to a workspace. A user may belong to multiple workspaces with different roles in each.

---

# Core Principles

## 1. Strict Isolation

Workspace data must NEVER leak between workspaces.

A user authenticated to workspace A must not:

- See files from workspace B
- Access shares from workspace B
- Enumerate members from workspace B
- Infer metadata about workspace B's existence

## 2. Role Per Workspace

A user's role is workspace-specific. The same user may be:

- Owner of workspace A
- Editor of workspace B
- Viewer of workspace C

The active workspace context determines what the user can do.

## 3. Ownership Transfer

Ownership can be transferred but never deleted while a workspace exists.
Every workspace must always have exactly one owner.

---

# Workspace Lifecycle

```txt
Created (by user or invited)
    ↓
Active (normal state, users can join/leave)
    ↓
Suspended (billing issue, admin action) → file access halted, shares disabled
    ↓
Re-activated (issue resolved)
    ↓
Deleted (owner action)
    ↓
Soft Delete (30 days grace)
    ↓
Purged (all data permanently removed from R2 and D1)
```

---

# Workspace Creation

## Automatic (First Signup)

When a user signs up for the first time:

1. Better Auth creates the user account
2. A default workspace is created with the user as Owner
3. System roles (Owner, Admin, Editor, Viewer) are seeded
4. Default workspace settings are applied
5. User is redirected to their workspace dashboard

## Manual (Dashboard)

Authenticated users can create additional workspaces:

```
POST /api/workspaces
body: { name, slug }
→ Creates workspace, assigns user as Owner
← Returns workspace with default settings
```

Limits: free tier = 1 workspace, pro tier = unlimited (future billing)

---

# Workspace Membership

## Inviting Members

```
Owner/Admin clicks "Invite Member"
    ↓
POST /api/workspaces/:id/members
body: { email, role: "editor" }
    ↓
Backend validates: inviter has users.invite permission
    ↓
Backend checks: email not already a member
    ↓
Backend creates invitation record (Better Auth organization plugin)
    ↓
Backend sends invitation email (via Cloudflare Email Routing or Resend)
    ↓
Email contains: invitation link with expiring token (7 days)
```

## Accepting Invitation

```
Recipient clicks invitation link
    ↓
GET /api/workspaces/join?token=xxx
    ↓
If new user: prompted to create account (Better Auth signup)
If existing user: redirected to login
    ↓
POST /api/workspaces/join/accept
    ↓
Backend validates: token not expired, not already used
    ↓
User becomes workspace member with assigned role
    ↓
Redirected to workspace dashboard
```

## Removing Members

```
Owner/Admin clicks member → "Remove"
    ↓
DELETE /api/workspaces/:id/members/:memberId
    ↓
Backend validates: actor has users.remove permission
    ↓
Backend validates: cannot remove the owner
    ↓
Backend validates: admin can only remove roles below theirs
    ↓
Member removed from workspace
    ↓
Member's files remain in workspace (ownership unchanged)
    ↓
Audit log: "user_removed" event
```

---

# Role Management

## Changing a Member's Role

```
Owner/Admin changes member role
    ↓
PATCH /api/workspaces/:id/members/:memberId
body: { role: "admin" }
    ↓
Backend validates: actor has users.update_roles permission
    ↓
Backend validates: actor cannot assign role higher than their own
    ↓
Backend validates: cannot demote the only owner
    ↓
Role updated
    ↓
If downgrade (admin → editor): active sessions invalidated
    ↓
Audit log: "role_changed" event
```

## Role Hierarchy

```
OWNER   → Can do everything. Only 1 per workspace. Can transfer ownership.
ADMIN   → Can manage users, files, shares, settings. Cannot delete workspace.
EDITOR  → Can upload, edit, move, rename, share files.
VIEWER  → Can read and download files only.
```

For detailed permissions, see `docs/backend/rbac.md`.

---

# Ownership Transfer

```
Current owner initiates transfer
    ↓
POST /api/workspaces/:id/transfer-ownership
body: { newOwnerId }
    ↓
Backend validates: actor is current owner
    ↓
Backend validates: new owner is an admin in the workspace
    ↓
Backend creates transfer request (pending)
    ↓
New owner receives notification
    ↓
New owner accepts
POST /api/workspaces/:id/transfer-ownership/accept
    ↓
Ownership transfers: old owner → admin, new admin → owner
    ↓
Transfer request:
  - old owner sessions remain valid (role downgraded to admin)
  - audit log: "ownership_transferred" event
  - notification sent to all workspace members
```

Timeout: if not accepted within 7 days, transfer request expires.

---

# Workspace Deletion

```
Owner clicks "Delete Workspace" (in Settings → Danger Zone)
    ↓
Confirmation modal: "Type the workspace name to confirm"
    ↓
DELETE /api/workspaces/:id
body: { confirmation: "my-workspace-name" }
    ↓
Backend validates: actor is owner
    ↓
Backend validates: confirmation matches workspace name/slug
    ↓
Workspace enters soft-delete state:
  - is_deleted = true, deleted_at = now
  - All files marked as deleted (soft-delete cascade)
  - All shares marked as inactive
  - All members notified via email
    ↓
30-day grace period:
  - Owner can restore workspace (undo deletion)
  - Files and data remain intact in R2 and D1
    ↓
After 30 days:
  - Cleanup worker purges all workspace files from R2
  - Cleanup worker hard-deletes database records
  - Audit log preserved (anonymized workspace reference)
```

---

# Workspace Settings

Stored in `WorkspaceSettings` table. Configurable by owner/admin.

| Setting                      | Type     | Default          | Description                                    |
| ---------------------------- | -------- | ---------------- | ---------------------------------------------- |
| `defaultShareExpirationDays` | int      | 30               | Default expiration for new share links         |
| `enablePublicSignup`         | bool     | false            | Allow email/password signup for this workspace |
| `allowedMimeTypes`           | string[] | [] (all allowed) | Restrict uploads to specific MIME types        |
| `maxFileSizeBytes`           | int      | 5GB              | Maximum upload size per file                   |
| `storageQuotaBytes`          | int      | 10GB             | Total storage limit (enforced on upload)       |
| `brandingLogoUrl`            | string   | null             | Custom logo URL for share pages                |
| `brandingName`               | string   | null             | Custom name for share pages                    |
| `trashRetentionDays`         | int      | 30               | Days before trash is auto-purged               |

---

# API Endpoints Summary

| Method   | Path                                     | Permission           |
| -------- | ---------------------------------------- | -------------------- |
| `GET`    | `/api/workspaces`                        | Authenticated        |
| `POST`   | `/api/workspaces`                        | Authenticated        |
| `GET`    | `/api/workspaces/:id`                    | Workspace member     |
| `PATCH`  | `/api/workspaces/:id`                    | `workspace.manage`   |
| `DELETE` | `/api/workspaces/:id`                    | Owner only           |
| `GET`    | `/api/workspaces/:id/members`            | Workspace member     |
| `POST`   | `/api/workspaces/:id/members`            | `users.invite`       |
| `PATCH`  | `/api/workspaces/:id/members/:uid`       | `users.update_roles` |
| `DELETE` | `/api/workspaces/:id/members/:uid`       | `users.remove`       |
| `POST`   | `/api/workspaces/:id/transfer-ownership` | Owner only           |

---

# Audit Events

| Event                   | Logged                                  |
| ----------------------- | --------------------------------------- |
| `workspace.created`     | actorId, workspaceId, workspaceName     |
| `workspace.deleted`     | actorId, workspaceId                    |
| `workspace.restored`    | actorId, workspaceId                    |
| `member.invited`        | actorId, targetEmail, role              |
| `member.joined`         | userId, workspaceId, role               |
| `member.removed`        | actorId, targetUserId, workspaceId      |
| `role.changed`          | actorId, targetUserId, oldRole, newRole |
| `ownership.transferred` | oldOwnerId, newOwnerId, workspaceId     |

---

# References

- [RBAC Architecture](../backend/rbac.md)
- [Data Model](../database/data-model.md)
- [Authentication](../architecture/authentication.md)
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
