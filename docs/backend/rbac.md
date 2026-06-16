# RBAC Architecture

# Purpose

This document defines the current BucketDrive v1 authorization model.

The system uses:

- role-based access control
- permission-based backend checks
- global bucket roles
- resource ownership rules for selected operations

The frontend is never trusted for authorization.

---

# Current Scope

BucketDrive v1 is a single-bucket app. Route and contract names still use `workspaceId` in several
places for compatibility, but authorization is based on `user.role`, not per-workspace membership.

Full workspace-scoped authorization is future work.

---

# Core Principles

## Permissions Over Roles

Roles are permission bundles. Backend code should check permissions through `can()`.

Correct:

```ts
can(role, "files.delete", resourceOwnerId, userId)
```

Avoid scattering direct role checks through business logic.

## Backend Enforcement

Every protected endpoint must validate:

1. authentication
2. permission
3. resource ownership or resource state when required

Frontend permission checks are UX helpers only.

---

# Roles

Supported roles:

```txt
owner
admin
manager
editor
viewer
guest
```

`owner` and `admin` have all permissions. `manager` can handle operational work such as files,
folders, shares, users read, audit read/export, analytics, and bucket settings read. `editor` can
create and modify content. `viewer` and `guest` are read-oriented.

The source of truth is `packages/shared/src/rbac/permissions.ts`.

---

# Permissions

Permissions follow `resource.action` naming.

Examples:

```txt
files.read
files.upload
files.rename
files.delete
folders.create
folders.delete
shares.create
shares.manage_all
users.invite
users.update_roles
trash.permanent_delete
bucket.settings.update
audit.read
```

---

# Enforcement Flow

```txt
Request
  ↓
Auth middleware validates session
  ↓
RBAC middleware reads user.role
  ↓
can() evaluates permission
  ↓
Route/service validates resource state and ownership
  ↓
Operation allowed or denied
```

For file and folder delete/restore operations, the middleware also checks resource ownership where
the policy allows owner-specific behavior.

---

# Sharing

External shares are isolated from internal RBAC:

- share links do not grant bucket membership
- public users cannot infer unrelated metadata
- password and expiration validation happen server-side
- signed URLs remain temporary capabilities, not durable permissions

---

# Audit Expectations

Authorization-sensitive operations should write audit logs, especially:

- uploads
- deletes and restores
- permanent trash purges
- share creation/revocation
- role changes
- ownership transfer
- settings changes

---

# Future Work

Multi-workspace RBAC would require workspace-scoped resources, membership tables, per-workspace
roles, and tenant filtering across all handlers and queries.
