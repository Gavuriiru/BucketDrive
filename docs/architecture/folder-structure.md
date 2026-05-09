# Folder Structure

# Purpose

This document defines the official project structure.

The structure must prioritize:
- scalability
- discoverability
- modularity
- consistency
- maintainability

All contributors and agents must follow this structure.

Avoid arbitrary organization.

---

# Monorepo Structure

```txt
/apps
/packages
/docs
/agents
/infrastructure
```

---

# Applications

# apps/web

Frontend application.

Contains:
- routes
- layouts
- frontend features
- frontend state
- UI integration

Example:

```txt
/apps/web
  /app
  /components
  /features
  /hooks
  /stores
  /lib
  /styles
```

---

# apps/api

Backend API.

Contains:
- routes
- controllers
- services
- repositories
- middleware

Example:

```txt
/apps/api
  /src
    /modules
    /middleware
    /services
    /repositories
    /routes
    /validators
```

---

# apps/workers

Background processing system.

Contains:
- queues
- jobs
- processors
- schedulers

Example:

```txt
/apps/workers
  /jobs
  /processors
  /queues
```

---

# Shared Packages

# packages/ui

Shared design system.

Contains:
- primitives
- reusable components
- themes
- animations
- icons

Example:

```txt
/packages/ui
  /components
  /hooks
  /styles
  /tokens
```

---

# packages/auth

Authentication abstraction.

Contains:
- auth providers
- session logic
- OAuth integration
- auth utilities

---

# packages/storage

Storage abstraction layer.

Contains:
- provider interfaces
- R2 adapters
- upload helpers
- signed URL logic

Example:

```txt
/packages/storage
  /providers
  /adapters
  /types
  /utils
```

---

# packages/rbac

Authorization system.

Contains:
- permission engine
- policy helpers
- role definitions
- authorization utilities

---

# packages/db

Database layer.

Contains:
- schema
- migrations
- repositories
- query helpers

Example:

```txt
/packages/db
  /schema
  /migrations
  /repositories
  /queries
```

---

# packages/shared

Shared utilities and contracts.

Contains:
- shared types
- constants
- schemas
- helpers

Avoid business logic here.

---

# Frontend Structure

# Route Structure

Use route-based organization.

Example:

```txt
/app/dashboard
/app/files
/app/shares
/app/settings
```

Avoid:
- giant flat route structures
- unclear nesting

---

# Feature Structure

Feature-based architecture is preferred.

Example:

```txt
/features/files
  /components
  /hooks
  /utils
  /services
  /types
```

Each feature should remain self-contained.

---

# Component Structure

Use layered components.

Preferred:

```txt
/components
  /ui
  /layout
  /shared
```

---

# UI Components

```txt
/components/ui
```

Contains:
- buttons
- modals
- inputs
- dropdowns

Reusable primitives only.

---

# Layout Components

```txt
/components/layout
```

Contains:
- sidebar
- topbar
- panels
- workspace layouts

---

# Shared Components

```txt
/components/shared
```

Contains:
- reusable feature-independent components

Avoid:
- business-specific logic here

---

# Hooks Structure

Hooks should remain categorized.

Example:

```txt
/hooks
  /api
  /ui
  /files
  /shares
```

Avoid giant generic hooks folders.

---

# Store Structure

State stores should remain isolated.

Example:

```txt
/stores
  explorer-store.ts
  modal-store.ts
  upload-store.ts
```

Avoid:
- monolithic global stores

---

# Backend Structure

# Module Architecture

Backend modules should remain domain-oriented.

Preferred:

```txt
/modules
  /files
  /folders
  /shares
  /users
  /workspaces
```

---

# Module Structure

Example:

```txt
/modules/files
  files.controller.ts
  files.service.ts
  files.repository.ts
  files.schemas.ts
  files.types.ts
```

---

# Controller Rules

Controllers:
- validate requests
- call services
- return responses

Avoid:
- business logic
- provider logic
- authorization duplication

---

# Service Rules

Services contain:
- business logic
- orchestration
- domain rules

Avoid:
- direct HTTP concerns
- duplicated validation

---

# Repository Rules

Repositories contain:
- database access
- query logic

Avoid:
- business rules
- authorization logic

---

# Validation Structure

Validation schemas should remain centralized.

Example:

```txt
/validators
```

or feature-local:

```txt
/modules/files/files.schemas.ts
```

Use:
- Zod

---

# Type Structure

Types should remain close to domain ownership.

Preferred:

```txt
files.types.ts
shares.types.ts
```

Avoid:
- giant global type files

---

# API Contract Structure

Shared API contracts belong in:

```txt
/packages/shared
```

Contains:
- DTOs
- response schemas
- shared validators

---

# Worker Structure

Workers should remain task-oriented.

Preferred:

```txt
/jobs
/processors
/queues
```

---

# Job Naming

Examples:

```txt
generate-thumbnail.job.ts
scan-virus.job.ts
index-file.job.ts
```

Avoid vague names.

---

# Documentation Structure

```txt
/docs
  /architecture
  /frontend
  /backend
  /security
  /features
  /database
  /decisions
```

Documentation must remain modular.

Avoid giant documentation files.

---

# ADR Structure

Architecture decisions belong in:

```txt
/docs/decisions
```

Format:

```txt
ADR-001-storage-provider.md
ADR-002-rbac-architecture.md
```

---

# Agent Structure

```txt
/agents
```

Contains:
- frontend-agent.md
- backend-agent.md
- security-agent.md

Agents define:
- behavior
- constraints
- architecture philosophy

---

# Naming Conventions

# File Naming

Use:

```txt
kebab-case
```

Examples:

```txt
file-explorer.tsx
share-modal.tsx
upload-service.ts
```

---

# Component Naming

Use:

```txt
PascalCase
```

Examples:

```txt
FileExplorer
ShareModal
UploadQueue
```

---

# Variable Naming

Use:
- descriptive names
- domain terminology

Avoid:
- vague abbreviations
- single-letter names

---

# Import Rules

Prefer:
- absolute imports
- domain-local imports

Avoid:
- deep relative import chains

Bad:

```ts
../../../../components
```

Preferred:

```ts
@/components/ui/button
```

---

# Separation Rules

Never mix:
- UI and business logic
- providers and services
- authorization and presentation
- storage and frontend concerns

Boundaries must remain explicit.

---

# Scalability Rules

The structure must support future:
- enterprise features
- realtime collaboration
- previews
- versioning
- billing
- plugin systems

Avoid structures that collapse at scale.

---

# Forbidden Structure Practices

Never:
- create giant folders
- create generic dump folders
- duplicate modules
- create unclear ownership
- mix unrelated concerns
- create god services
- create god components

Avoid:
- random utilities folders
- oversized shared folders

---

# Final Rule

Whenever uncertain:
prioritize:
- modularity
- discoverability
- explicit ownership
- consistency
over short-term convenience.