# CI/CD Pipeline

# Purpose

This document defines the continuous integration and deployment pipeline.

The pipeline must:

- Guarantee that only passing code reaches production
- Deploy frontend and backend independently
- Run database migrations safely
- Provide fast feedback to developers (PR checks < 5 minutes)
- Support multiple environments (dev, staging, production)

---

# Pipeline Overview

```txt
Developer Push
    ↓
Pre-commit Hook (local)
    ├── lint-staged (ESLint + Prettier)
    └── typecheck (staged files)
    ↓
GitHub Actions (CI)
    ├── Lint (ESLint)
    ├── Typecheck (tsc --noEmit)
    ├── Unit Tests (Vitest)
    ├── Contract Tests (Vitest + test D1)
    └── Build Check (vite build + wrangler deploy --dry-run)
    ↓
PR Merge to main
    ↓
Staging Deploy (automatic)
    ├── D1 migrations → staging DB
    ├── Worker deploy → staging
    └── Pages deploy → staging
    ↓
E2E Tests (Playwright) on staging
    ↓
Manual QA / Approval
    ↓
Production Deploy (tag push: v*)
    ├── D1 migrations → production DB
    ├── Worker deploy → production
    └── Pages deploy → production
```

---

# GitHub Actions Workflow

## `ci.yml` — Pull Request Checks

Triggered on `pull_request` to `main` and `push` to `main`.

The versioned workflow in `.github/workflows/ci.yml` runs:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:contracts
pnpm perf:bundle
```

`pnpm build` intentionally runs before lint/typecheck because Turbo config makes those tasks depend
on upstream package builds.

## `deploy-staging.yml` — Auto Deploy to Staging

Triggered on `push` to `main` and `workflow_dispatch`.

The versioned workflow in `.github/workflows/deploy-staging.yml` runs:

```bash
pnpm install --frozen-lockfile
pnpm staging:prepare
pnpm staging:check
pnpm db:migrate:staging
pnpm --filter @bucketdrive/api exec wrangler --config ../../wrangler.toml deploy --env staging
pnpm build
pnpm perf:bundle
pnpm perf:lighthouse
pnpm --filter @bucketdrive/api exec wrangler pages deploy ../../apps/web/dist --project-name bucketdrive --branch staging
pnpm test:e2e
pnpm test:a11y
```

The staging E2E base URL is read from `PLAYWRIGHT_BASE_URL`, matching `playwright.config.ts`.
`pnpm staging:prepare` fills `wrangler.toml` from `STAGING_D1_DATABASE_ID` in the GitHub
environment, and `pnpm staging:check` fails early if Cloudflare credentials or the staging D1 ID
are missing.

## `deploy-prod.yml` — Production Deploy

Triggered on: `push` of `v*` tag (e.g., `v1.0.0`)

Same structure as staging but targets `--env production` and production D1 database.

Requires manual approval step (GitHub Environments protection rule).

---

# Environments

| Environment     | Frontend URL                      | Worker URL                            | D1 Database              | Purpose             |
| --------------- | --------------------------------- | ------------------------------------- | ------------------------ | ------------------- |
| **Development** | `http://localhost:5173`           | `http://localhost:8787`               | Local Wrangler D1        | Active development  |
| **Staging**     | `https://staging.bucketdrive.dev` | `https://staging-api.bucketdrive.dev` | `bucketdrive-db-staging` | Pre-release testing |
| **Production**  | `https://drive.nekomata.moe`      | `https://drive.nekomata.moe/api`      | `bucketdrive-db`         | Live users          |

---

# Environment Variables

### Frontend (`apps/web`)

```
VITE_API_URL=https://api.bucketdrive.app
VITE_APP_NAME=BucketDrive
```

Vite prefixes all client-side env vars with `VITE_`.

### Backend (`apps/api`)

```
# .env.staging / .env.production, then pnpm env:push:staging or pnpm env:push:prod

# Better Auth
BETTER_AUTH_SECRET=<random-64-char>
BETTER_AUTH_URL=https://api.bucketdrive.app
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# R2
R2_BUCKET_NAME=bucketdrive-files
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com

# D1
D1_DATABASE_ID=... # bound via wrangler.toml [[d1_databases]]

# App
APP_URL=https://bucketdrive.app
API_URL=https://api.bucketdrive.app
PLATFORM_OWNER_EMAIL=admin@example.com
```

`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are local/CI deploy credentials, not Worker
runtime vars, so `pnpm env:push:*` does not upload them as secrets.

For staging, create the D1 database once and store the returned non-secret database ID as the
GitHub environment variable `STAGING_D1_DATABASE_ID`:

```bash
npx wrangler d1 create bucketdrive-db-staging
STAGING_D1_DATABASE_ID=<database-id> pnpm staging:prepare
STAGING_D1_DATABASE_ID=<database-id> CLOUDFLARE_ACCOUNT_ID=<account-id> CLOUDFLARE_API_TOKEN=<token> pnpm staging:check
```

---

# pre-commit Hooks

```json
// .husky/pre-commit
{
  "hooks": {
    "pre-commit": "lint-staged"
  }
}

// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  }
}
```

---

# Build Process

## Frontend (`apps/web`)

```bash
vite build          # → apps/web/dist/
```

Static files deployed to Cloudflare Pages. No server runtime needed.

## Backend (`apps/api`)

```bash
wrangler deploy     # → Cloudflare Workers
```

Worker bundles Hono + Better Auth + Drizzle ORM. Deployed as a single Worker.

## Background Jobs (`apps/workers`)

```bash
wrangler deploy     # → Separate Worker (if needed for thumbnail gen, cleanup)
```

Separate Worker to avoid blocking API requests with heavy processing.

---

# Rollback Strategy

| Component            | Rollback                                                           |
| -------------------- | ------------------------------------------------------------------ |
| **Pages (Frontend)** | `wrangler pages deployment rollback` or revert commit + re-deploy  |
| **Worker (API)**     | `wrangler rollback` to previous deployment                         |
| **D1 Migration**     | Deploy a new migration that reverses the change (no auto-rollback) |

Migrations are append-only. If a migration breaks production, deploy a _fix migration_.
Never delete or modify committed migration files.

---

# Monitoring & Alerts

- Cloudflare Workers observability: request volume, error rate, latency (free in dashboard)
- Cloudflare Pages analytics: page views, bandwidth
- Error tracking: Workers `console.error` → Cloudflare Logpush (future: Sentry integration)
- Uptime monitoring: external health check on `GET /api/health`
- Alert on: error rate > 1%, latency > 500ms p95, deployment failures

---

# Branch Strategy

```
main           Production-ready code. Auto-deploys to staging.
  ├── feat/*   Feature branches. Deploy preview on Cloudflare Pages.
  ├── fix/*    Bug fix branches. Deploy preview.
  ├── docs/*   Documentation changes. No deploy needed.
  └── chore/*  Tooling, dependencies, CI changes.
```

- PR from `feat/*` → `main` triggers CI checks
- Merge to `main` triggers staging deploy + E2E
- Tag `v*` triggers production deploy (with manual approval)

---

# Security in CI

- Secrets stored in GitHub Secrets (never in code, never in config files)
- `wrangler.toml` uses environment variable references, not hardcoded values
- D1 migrations run with least-privilege API token (only D1 write access)
- Production deploy API tokens are scoped to production only
- No environment secrets accessible in PR workflows from forks

---

# References

- [Cloudflare Pages Deploy](https://developers.cloudflare.com/pages/configuration/deployments/)
- [Cloudflare Workers Deploy](https://developers.cloudflare.com/workers/wrangler/deploy/)
- [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [GitHub Actions Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments)
