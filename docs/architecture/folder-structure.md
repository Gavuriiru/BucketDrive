# Folder Structure

# Purpose

This document describes the current BucketDrive monorepo layout.

The repository uses pnpm workspaces and Turborepo. The active packages are `apps/web`, `apps/api`,
`apps/workers`, and `packages/shared`.

---

# Monorepo Structure

```txt
apps/
  web/        React SPA
  api/        Hono API on Cloudflare Workers
  workers/    Scheduled/background Worker

packages/
  shared/     Drizzle schema, migrations, contracts, schemas, RBAC, shared types

docs/         Architecture, feature, backend, frontend, security, and storage docs
agents/       Agent prompt files, not runtime code
scripts/      Migration, seed, deployment, R2, and CI helper scripts
```

`tooling/` is reserved and currently empty.

---

# Applications

## apps/web

Frontend React application.

Contains:

- TanStack Router route definitions
- feature components for files, folders, shares, upload, notifications, previews, and tags
- layout components
- Zustand stores
- TanStack Query API hooks
- Playwright E2E tests
- Tailwind v4 styles

## apps/api

Cloudflare Worker API.

Contains:

- Hono app entrypoint
- auth and RBAC middleware
- feature modules for files, folders, shares, trash, search, members, invitations, dashboard,
  platform, notifications, tags, and batch operations
- storage, upload, thumbnail, trash, and R2 import services
- Vitest unit and contract tests

## apps/workers

Scheduled background Worker.

Runs:

- trash cleanup
- R2 import/sync
- thumbnail backfill

---

# Shared Package

## packages/shared

Shared source of truth for:

- Drizzle schema and migrations
- Zod API contracts
- frontend/backend schemas
- RBAC permissions, roles, policies, and `can()`
- constants and shared exported types

Runtime business logic stays in `apps/api`; reusable contracts and types stay in
`packages/shared`.

---

# Historical Note

Older planning docs mention separate `packages/ui`, `packages/auth`, `packages/storage`,
`packages/rbac`, and `packages/db` packages. Those packages are not present in the current v1.
Their responsibilities are implemented in `apps/*` and `packages/shared`.
