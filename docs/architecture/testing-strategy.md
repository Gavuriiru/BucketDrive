# Testing Strategy

# Purpose

This document defines the testing approach for the entire platform.

Testing ensures:
- Correctness of business logic (RBAC, sharing, uploads)
- Contract consistency between frontend and backend
- Accessibility compliance
- Security invariants (no privilege escalation, no workspace leakage)
- Regression prevention as the codebase grows

Testing is mandatory. Untested critical paths must not reach production.

---

# Testing Pyramid

```txt
         /\
        /E2E\          Playwright — critical user journeys (5-10 scenarios)
       /------\
      /  API   \        Integration — Worker endpoints with real D1 (test DB)
     / Contract \
    /-------------\
   /   Services    \    Unit — pure logic: RBAC, validators, utilities
  /-----------------\
 /   Type System     \  TypeScript strict + Zod — catches errors at compile time
/---------------------\
```

---

# Level 1: Type System (Baseline)

**Tool**: TypeScript strict mode + Zod schemas

All code must:
- Pass `tsc --noEmit` with strict mode enabled
- Use Zod for all API boundaries (shared contracts in `packages/shared`)
- Never use `any`, `as unknown as T`, or unchecked type assertions

**What it catches**: mismatched shapes, missing fields, wrong types — before any test runs.

---

# Level 2: Unit Tests

**Tool**: Vitest  
**Location**: co-located `*.test.ts` files  
**Coverage target**: 80%+ on services, 100% on RBAC engine

## What to Unit Test

| Domain | Examples |
|---|---|
| **RBAC engine** | `can(user, "files.delete")` true/false for each role |
| **Zod validators** | Valid/invalid payloads for every request schema |
| **Storage provider** | Mocked provider: upload returns signed URL shape, delete confirms |
| **Share validation** | Expired share → denied, locked share → denied, valid → allowed |
| **Utilities** | Slug generation, path sanitization, checksum verification |
| **Permission composition** | Role inheritance, workspace scoping |

## Example

```ts
// packages/rbac/src/__tests__/can.test.ts
import { describe, it, expect } from "vitest"
import { can } from "../can"
import { workspaceMember } from "../test-fixtures"

describe("can", () => {
  it("allows editor to read files", () => {
    const member = workspaceMember({ role: "editor" })
    expect(can(member, "files.read")).toBe(true)
  })

  it("denies viewer from deleting files", () => {
    const member = workspaceMember({ role: "viewer" })
    expect(can(member, "files.delete")).toBe(false)
  })

  it("blocks access to files in another workspace", () => {
    const member = workspaceMember({ role: "editor", workspaceId: "ws_A" })
    expect(canAccessWorkspace(member, "ws_B")).toBe(false)
  })
})
```

---

# Level 3: Contract Tests

**Tool**: Vitest + Zod  
**Location**: `apps/api/src/__tests__/contracts/`

Contract tests verify that the API responds with data matching the shared schemas.
They are cheap to run (no browser) and catch the most common integration bugs.

## What to Test

```ts
// apps/api/src/__tests__/contracts/files.test.ts
import { ListFilesResponse, InitiateUploadResponse } from "@bucketdrive/shared"

describe("GET /api/workspaces/:id/files", () => {
  it("returns valid ListFilesResponse shape", async () => {
    const res = await worker.fetch("/api/workspaces/test-ws/files")
    const body = await res.json()

    // Fails loudly if schema mismatches
    expect(() => ListFilesResponse.parse(body)).not.toThrow()
    expect(res.status).toBe(200)
  })

  it("returns 401 without auth", async () => {
    const res = await worker.fetch("/api/workspaces/test-ws/files", {
      headers: {} // no cookie
    })
    expect(res.status).toBe(401)
  })
})
```

## Contract Testing Rules

- Every endpoint must have at least: success shape test + auth required test
- Mutations must also test: RBAC denied (wrong role), validation error (bad input)
- Contract tests run against a test D1 database (seeded per test file)

---

# Level 4: E2E Tests

**Tool**: Playwright  
**Location**: `apps/web/e2e/`

E2E tests simulate real user flows in a real browser against a staging environment.

## Critical User Journeys

| Journey | Priority |
|---|---|
| **Auth**: Login with OAuth → session persists → logout | Critical |
| **Upload**: Navigate to folder → drag file → see progress → file appears | Critical |
| **Share**: Create share link with password → external user accesses → password validates → downloads file | Critical |
| **RBAC**: Viewer tries to delete file → API blocks it → UI hides delete button | Critical |
| **Search**: Type query → results appear → filters work → clear returns to browse | High |
| **Workspace**: Owner invites user → user accepts → user sees correct workspace | High |
| **Trash**: Delete file → appears in trash → restore → appears in original folder | High |

## Example

```ts
// apps/web/e2e/sharing.spec.ts
import { test, expect } from "@playwright/test"

test("external user can access password-protected share", async ({ page }) => {
  // Create share as internal user
  await page.goto("/dashboard/shares")
  await page.click("[data-testid='create-share']")
  await page.fill("[data-testid='share-password']", "secret123")
  await page.click("[data-testid='share-submit']")
  const shareUrl = await page.inputValue("[data-testid='share-url']")

  // Access as external user (new context = no auth)
  const externalPage = await page.context().browser().newContext()
  const external = await externalPage.newPage()
  await external.goto(shareUrl)
  await external.fill("[data-testid='password-input']", "secret123")
  await external.click("[data-testid='password-submit']")
  await expect(external.locator("[data-testid='download-button']")).toBeVisible()
})
```

---

# CI Integration

```yaml
# .github/workflows/test.yml
jobs:
  typecheck:
    - pnpm typecheck

  unit:
    - pnpm test:unit

  contracts:
    - pnpm test:contracts

  e2e:
    - pnpm test:e2e
    # Only on PRs to main, not every commit
```

- Unit + contract tests run on every push
- E2E tests run on PRs to `main` and on `main` merge (staging deploy trigger)

---

# Test Data

- Unit tests: use factory functions (`workspaceMember(...)`, `fileObject(...)`) for fixtures
- Contract tests: D1 test database seeded per test file, cleaned up after
- E2E tests: dedicated staging workspace seeded before test run, cleaned up after

---

# Accessibility Testing

Playwright includes `@axe-core/playwright` for automated accessibility checks:

```ts
import { checkA11y } from "@axe-core/playwright"

test("file explorer meets accessibility standards", async ({ page }) => {
  await page.goto("/dashboard/files")
  const results = await checkA11y(page)
  expect(results.violations).toEqual([])
})
```

Critical components: file explorer, share modal, login page, settings.

---

# Performance Testing

- Lighthouse CI in GitHub Actions for PRs
- Bundle size check on every push (compare against baseline)
- Virtualization benchmark: render 10,000 files in < 500ms

---

# Test Matrix by Component

| Component | Unit | Contract | E2E | A11y |
|---|---|---|---|---|
| RBAC engine | Yes | — | Yes | — |
| Upload service | Yes | Yes | Yes | — |
| File explorer | — | Yes | Yes | Yes |
| Share system | Yes | Yes | Yes | Yes |
| Search | Yes | Yes | Yes | Yes |
| Auth middleware | Yes | Yes | Yes | Yes |
| Design system | Yes (snapshot) | — | — | Yes |

---

# Commands

```bash
pnpm test:unit        # Vitest — unit tests
pnpm test:contracts   # Vitest — contract tests against test D1
pnpm test:e2e         # Playwright — critical user journeys
pnpm test:a11y        # Playwright + axe-core — accessibility
pnpm test:all         # Run everything (CI)
```

---

# References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Axe Core Playwright](https://www.npmjs.com/package/@axe-core/playwright)
- [API Contracts](api-contracts.md)
- [RBAC Architecture](../backend/rbac.md)
