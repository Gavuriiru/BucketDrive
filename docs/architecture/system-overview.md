# System Overview

# Purpose

This document defines the high-level architecture of the platform.

The system is a modern single-bucket cloud storage platform focused on:

- file management
- secure sharing
- RBAC
- bucket collaboration
- desktop-like UX
- scalable storage abstraction

The architecture must prioritize:

- scalability
- maintainability
- modularity
- security
- performance
- clean domain boundaries

---

# Current Product Scope

BucketDrive v1 manages one default bucket. Some API paths still include `workspaceId` for
compatibility with the original roadmap, but the implementation does not currently provide multiple
isolated workspaces or per-workspace memberships.

Full multi-workspace support is future work and would require a database/API migration.

---

# Monorepo Structure

```txt
/apps
  /web
  /api
  /workers

/packages
  /shared
```

---

# Applications

## apps/web

Frontend application.

Responsibilities:

- user interface
- navigation
- uploads
- file browsing
- keyboard interactions
- context menus
- dashboards
- sharing management

Tech stack:

- React 19 + TypeScript + Vite (SPA)
- TailwindCSS
- shadcn/ui
- TanStack Router
- Zustand
- TanStack Query

The frontend must NEVER:

- directly access the database
- directly access storage providers
- enforce security rules alone

---

## apps/api

Main backend API.

Responsibilities:

- authentication
- RBAC enforcement
- file metadata
- sharing logic
- bucket membership and settings
- audit logging
- signed URL generation

The API is the source of truth for:

- permissions
- ownership
- business logic

---

## apps/workers

Background processing services.

Responsibilities:

- thumbnail generation
- metadata extraction
- file indexing
- virus scanning
- cleanup jobs
- scheduled tasks

Workers must be isolated from frontend concerns.

---

# Shared Package

## packages/shared

Shared utilities and types.

Contains:

- shared TypeScript types
- constants
- helpers
- API contracts
- validation schemas
- Drizzle schema and migrations
- RBAC permissions, roles, and `can()`

Storage provider implementation lives in `apps/api/src/services/storage.ts`. Frontend design
primitives currently live in `apps/web/src/components`.

---

# Core Domains

## User

Represents authenticated platform users.

Capabilities:

- upload files
- create shares
- manage resources
- access the bucket

---

## Bucket Membership

Logical administration scope for users, roles, files, permissions, and quotas in v1.

---

## Bucket

Logical storage container.

Maps to:

- R2 buckets
- future S3-compatible providers

The v1 app manages one default bucket.

---

## FileObject

Represents stored files.

Contains:

- metadata
- ownership
- path
- mime type
- tags
- sharing metadata

File binary data is NOT stored in the database.

---

## Folder

Virtual organizational structure.

Folders may:

- contain files
- contain nested folders
- inherit permissions

---

## ShareLink

Represents external resource sharing.

Capabilities:

- expiration
- password protection
- readonly access
- revocation

Share links must be auditable.

---

# Request Flow

## Standard File Upload

```txt
User
  ↓
Frontend
  ↓
API Validation
  ↓
RBAC Check
  ↓
Signed Upload URL
  ↓
Storage Provider
  ↓
Metadata Registration
  ↓
Audit Log
```

---

## File Download

```txt
User
  ↓
Frontend
  ↓
API Authorization
  ↓
RBAC Validation
  ↓
Signed Download URL
  ↓
Storage Provider
```

---

## External Share Access

```txt
External User
  ↓
Share Gateway
  ↓
Password Validation
  ↓
Expiration Validation
  ↓
Readonly Access
  ↓
Temporary Signed URL
```

---

# Security Model

Security is enforced server-side.

Frontend permissions are NOT trusted.

All sensitive operations require:

- authentication
- RBAC validation
- ownership validation
- audit logging

---

# Authentication Architecture

Authentication provider: **Better Auth** (runs in Cloudflare Worker, D1-backed)

Supported methods:

- OAuth (GitHub, Google)
- Email/password credentials
- Session-based authentication (HTTPOnly cookies)

Authentication responsibilities:

- Identity validation
- Session management (creation, refresh, revocation)
- Bucket role resolution
- Secure cookies (HTTPOnly, Secure, SameSite=Strict)
- MFA compatibility (future)

Better Auth integrates via Hono middleware:

```txt
Request
    ↓
Better Auth middleware (validate session cookie)
    ↓
Extract user + bucket role
    ↓
RBAC middleware (validate permissions)
    ↓
Route handler
```

When external identity providers are needed, Better Auth supports OAuth2/OIDC with
GitHub and Google built-in, extensible to any OIDC provider.

For ADR details, see: docs/decisions/ADR-002-better-auth.md

---

# Authorization Architecture

Authorization is permission-based.

Roles are collections of permissions.

Example:

```txt
ADMIN
 ├── files.read
 ├── files.write
 ├── shares.manage
 └── users.manage
```

Permissions must remain granular.

---

# Sharing Architecture

The v1 platform supports external sharing as the primary flow.

## Internal Sharing (Compatibility)

Legacy/API-supported sharing between authenticated bucket users.

Capabilities:

- readonly
- editor
- manager

---

## External Direct Sharing

Public readonly links.

Capabilities:

- optional password
- expiration
- direct download

Flow with password protection:

```txt
External User
    ↓
Share Landing Page
    ↓
Password Prompt (if protected)
    ↓
Brute-Force Validation (max 5 attempts / 15 min)
    ↓
Access Granted → Signed Download URL
Access Denied  → 403 (or lock after 10 failures)
```

## External Explorer Sharing

Readonly folder browsing interface.

Capabilities:

- navigation
- file previews
- individual downloads

Restrictions:

- no modification
- no uploads
- no deletes

---

# Frontend Architecture

Frontend architecture must prioritize:

- modularity
- accessibility
- composability
- predictable state

---

## State Separation

### Server State

Managed using:

- TanStack Query

Examples:

- file lists
- bucket data
- shares
- user sessions

---

### Client UI State

Managed using:

- Zustand

Examples:

- modal visibility
- selected files
- drag state
- sidebar state

---

# UI Architecture

UI must use:

- reusable primitives
- shared tokens
- semantic components

Avoid:

- duplicated layouts
- one-off components
- visual inconsistency

---

# Performance Architecture

Required:

- virtualization
- lazy loading
- route splitting
- optimistic updates
- image optimization

Large directories must remain performant.

---

# Background Processing

Workers handle:

- thumbnails
- metadata extraction
- search indexing
- cleanup jobs

Heavy operations must NEVER block UI interactions.

---

# Audit Logging

Critical actions must generate logs:

- uploads
- deletions
- permission changes
- sharing actions
- login attempts

Logs must include:

- actor
- action
- resource
- timestamp
- IP address

---

# Error Handling

All systems must provide:

- typed errors
- structured responses
- user-friendly messaging
- retry mechanisms

Avoid generic failures.

---

# Future Scalability

The architecture must support future:

- multi-region storage
- realtime collaboration
- file versioning
- previews
- OCR
- enterprise SSO
- billing systems
- object lifecycle policies

The architecture must remain provider-agnostic whenever possible.
