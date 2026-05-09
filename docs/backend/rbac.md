rbac.md# RBAC Architecture

# Purpose

This document defines the authorization architecture of the platform.

The system uses:
- RBAC (Role-Based Access Control)
- permission-based authorization
- backend-enforced security

Authorization must be:
- granular
- composable
- auditable
- scalable
- workspace-aware

The frontend is NEVER trusted for authorization.

---

# Core Principles

## 1. Permissions Over Roles

Roles are collections of permissions.

The system must NEVER:
- directly check roles
- hardcode admin logic
- bypass permission evaluation

Forbidden:

```ts
if (user.role === "admin")
```

Required:

```ts
can(user, "files.delete")
```

---

## 2. Backend Enforcement

All authorization must be enforced server-side.

Frontend checks are UX helpers only.

The backend is always the source of truth.

---

## 3. Granular Permissions

Permissions must be:
- explicit
- narrow
- composable

Avoid broad permissions like:
- "manage_everything"

Prefer:
- files.read
- files.write
- files.delete
- shares.create
- users.manage

---

# Permission Model

Permissions follow this format:

```txt
resource.action
```

Examples:

```txt
files.read
files.write
files.delete
folders.create
folders.rename
shares.create
shares.revoke
users.invite
users.remove
billing.read
audit.read
```

---

# Role Model

Roles are permission bundles.

Roles should simplify management,
NOT replace permission checks.

---

# Default Roles

## OWNER

Full workspace control.

Capabilities:
- manage workspace
- manage users
- manage billing
- manage permissions
- manage storage

---

## ADMIN

Administrative management.

Capabilities:
- manage users
- manage files
- manage shares
- manage permissions

Restrictions:
- cannot transfer ownership

---

## MANAGER

Operational management.

Capabilities:
- manage files
- manage folders
- manage shares
- view analytics

Restrictions:
- cannot manage admins
- cannot manage billing

---

## EDITOR

Content modification role.

Capabilities:
- upload
- edit
- move
- rename
- share

Restrictions:
- no administrative access

---

## VIEWER

Readonly access.

Capabilities:
- read files
- download files
- access shared content

Restrictions:
- no modifications

---

## GUEST

Restricted readonly access.

Capabilities:
- limited resource viewing

Restrictions:
- isolated scope
- limited workspace visibility

---

# Permission Evaluation

Authorization must consider:

- role permissions
- resource ownership
- workspace membership
- resource visibility
- share permissions
- inheritance rules

---

# Authorization Flow

```txt
User Request
    ↓
Authentication Validation
    ↓
Workspace Membership Validation
    ↓
Permission Evaluation
    ↓
Resource Ownership Validation
    ↓
Operation Allowed / Denied
```

---

# Workspace Isolation

All permissions are workspace-scoped.

Users from one workspace must NEVER:
- access another workspace
- query foreign resources
- infer foreign metadata

Workspace isolation is mandatory.

---

# Ownership Rules

Ownership affects authorization.

Example:
- file owners may revoke their own shares
- workspace owners may override permissions

Ownership does NOT bypass RBAC automatically.

---

# File Permissions

Files support granular operations.

Possible permissions:

```txt
files.read
files.upload
files.rename
files.move
files.copy
files.delete
files.restore
files.favorite
files.tag
files.share
```

---

# Folder Permissions

Folders support:

```txt
folders.read
folders.create
folders.rename
folders.move
folders.delete
folders.share
```

Folder permissions may inherit downward.

---

# Share Permissions

Sharing operations require explicit permissions.

Examples:

```txt
shares.create
shares.update
shares.revoke
shares.read
```

---

# User Management Permissions

Examples:

```txt
users.invite
users.remove
users.update_roles
users.read
```

Users must NEVER:
- elevate themselves
- assign higher permissions than their own

---

# Billing Permissions

Billing must remain isolated.

Examples:

```txt
billing.read
billing.manage
```

Only authorized roles may:
- view invoices
- change plans
- modify quotas

---

# Audit Permissions

Audit logs are sensitive.

Examples:

```txt
audit.read
audit.export
```

Audit access should remain highly restricted.

---

# Permission Inheritance

Some resources inherit permissions.

Example:

```txt
Workspace
    ↓
Folder
    ↓
Subfolder
    ↓
File
```

Inheritance rules must remain predictable.

Avoid:
- circular inheritance
- conflicting overrides

---

# Share Authorization

External sharing must remain isolated from internal RBAC.

External share links:
- do not grant workspace access
- do not expose internal metadata
- operate in readonly isolation unless explicitly allowed

---

# Temporary Access

Temporary permissions may exist for:
- expiring shares
- temporary collaborators
- support sessions

Temporary access must:
- expire automatically
- remain auditable

---

# Revocation Rules

Revoking access must:
- invalidate active sessions when necessary
- revoke share links
- update cache state
- invalidate signed URLs when applicable

---

# Signed URL Security

Signed URLs:
- must expire
- must be scoped
- must never expose unrestricted storage access

Signed URLs are temporary capabilities,
NOT permissions themselves.

---

# API Authorization Rules

Every protected endpoint must:

1. validate authentication
2. validate workspace membership
3. validate permissions
4. validate ownership if needed

Authorization must NEVER rely on:
- frontend state
- hidden UI
- client flags

---

# Audit Logging

Authorization-sensitive actions must generate logs.

Required events:
- permission changes
- role updates
- access revocations
- share creation
- share revocation
- failed authorization attempts

---

# Forbidden Practices

Never:
- hardcode roles
- bypass permission checks
- trust frontend authorization
- expose unauthorized metadata
- use wildcard admin access
- duplicate permission logic
- mix authentication with authorization

---

# Recommended Architecture

Authorization should use:

```txt
Request
  ↓
Auth Middleware
  ↓
Permission Middleware
  ↓
Resource Policy
  ↓
Service Layer
```

---

# Recommended Utilities

Preferred APIs:

```ts
can(user, permission)

canAccessResource(user, resource)

hasWorkspaceAccess(user, workspaceId)
```

Avoid:
- scattered inline permission logic
- duplicated checks

---

# Resource Policies

Complex resources should use policies.

Example:

```ts
FilePolicy.canDelete(user, file)
```

Policies centralize:
- ownership rules
- inheritance
- permission logic

---

# Multi-Layer Validation

Authorization should validate:

## Identity

Who is the user?

---

## Membership

Does the user belong to this workspace?

---

## Permission

Does the user have permission?

---

## Resource Scope

Can the user access THIS resource?

---

## State Validation

Is the resource still valid?
- not deleted
- not archived
- not expired

---

# Future Scalability

The RBAC system must support future:
- enterprise policies
- custom roles
- permission groups
- organization hierarchies
- delegated administration
- audit exports
- SSO role mapping

The architecture must remain extensible.