# System Overview

# Purpose

This document defines the high-level architecture of the platform.

The system is a modern cloud storage platform focused on:
- file management
- secure sharing
- RBAC
- collaboration
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

# Monorepo Structure

```txt
/apps
  /web
  /api
  /workers

/packages
  /ui
  /auth
  /storage
  /rbac
  /db
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
- Next.js App Router
- React
- TailwindCSS
- shadcn/ui
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
- workspace management
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

# Shared Packages

## packages/ui

Shared design system.

Contains:
- reusable components
- tokens
- typography
- animations
- spacing rules
- theme system

All frontend applications must use this package.

---

## packages/auth

Authentication system abstraction.

Responsibilities:
- session handling
- OAuth
- Zero Trust integration
- auth utilities
- permission helpers

---

## packages/storage

Storage abstraction layer.

This package isolates:
- Cloudflare R2
- S3-compatible providers
- signed uploads
- multipart uploads

The application must NEVER directly depend on provider-specific APIs.

Required abstraction:

```ts
interface StorageProvider {
  upload()
  delete()
  move()
  copy()
  list()
  getSignedUrl()
}
```

---

## packages/rbac

Authorization engine.

Responsibilities:
- permission checks
- role composition
- policy evaluation

The application must NEVER:
- hardcode permissions
- check roles directly

Correct:

```ts
can(user, "files.delete")
```

Incorrect:

```ts
if (user.role === "admin")
```

---

## packages/db

Database layer.

Responsibilities:
- schema definitions
- migrations
- database access
- query utilities

Must expose:
- typed queries
- reusable repositories
- transaction helpers

---

## packages/shared

Shared utilities and types.

Contains:
- shared TypeScript types
- constants
- helpers
- API contracts
- validation schemas

---

# Core Domains

## User

Represents authenticated platform users.

Capabilities:
- upload files
- create shares
- manage resources
- access workspaces

---

## Workspace

Logical organizational unit.

Contains:
- users
- buckets
- files
- permissions
- quotas

A user may belong to multiple workspaces.

---

## Bucket

Logical storage container.

Maps to:
- R2 buckets
- future S3-compatible providers

Buckets are isolated by workspace ownership.

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

Supported methods:
- OAuth
- Cloudflare Zero Trust
- session authentication

Authentication responsibilities:
- identity validation
- session management
- secure cookies
- MFA compatibility

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

The platform supports:

## Internal Sharing

Between authenticated users.

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

---

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
- workspace data
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
- antivirus scanning
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