# Development Setup

# Purpose

This document provides step-by-step instructions for setting up the project locally.

---

# Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Cloudflare Wrangler** >= 3.0.0 (`npm install -g wrangler`)
- **Cloudflare Account** (free tier works for development)
- **GitHub OAuth App** or **Google OAuth Client** (for Better Auth social login)

---

# Initial Setup

## 1. Clone the repository

```bash
git clone https://github.com/your-org/bucketdrive
cd bucketdrive
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Set up environment variables

```bash
cp .env.example apps/api/.env
```

Edit `apps/api/.env` with your credentials:

```env
# Better Auth
BETTER_AUTH_SECRET=<generate: openssl rand -base64 64>
BETTER_AUTH_URL=http://localhost:8787

# OAuth Providers (pick at least one)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# R2
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=bucketdrive-dev
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com

# App
APP_URL=http://localhost:5173
API_URL=http://localhost:8787
```

## 4. Initialize the database

```bash
# Create local SQLite database and apply migrations
pnpm db:migrate:dev

# Seed with development data
pnpm db:seed
```

This creates:
- `apps/api/.db/local.sqlite` — development database
- Default workspace with test user
- System roles (Owner, Admin, Editor, Viewer)
- Sample folders and files

## 5. Start development servers

```bash
# Start both frontend and backend
pnpm dev
```

This runs:
- **Frontend**: `http://localhost:5173` (Vite dev server with HMR)
- **Backend**: `http://localhost:8787` (Wrangler dev server with live reload)

---

# OAuth Setup

## GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set:
   - Homepage URL: `http://localhost:8787`
   - Authorization callback URL: `http://localhost:8787/api/auth/callback/github`
4. Copy Client ID and Client Secret to `apps/api/.env`

## Google OAuth Client

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:8787/api/auth/callback/google`
4. Copy Client ID and Client Secret to `apps/api/.env`

---

# Database Commands

```bash
pnpm db:generate     # Generate migration from schema changes
pnpm db:migrate:dev  # Apply migrations to local SQLite
pnpm db:seed         # Seed local database
pnpm db:studio       # Open Drizzle Studio (http://localhost:4983)
pnpm db:reset        # Delete + recreate local database
```

---

# Testing

```bash
pnpm test:unit       # Unit tests (Vitest)
pnpm test:contracts  # API contract tests
pnpm test:e2e        # E2E tests (Playwright, requires staging env)
pnpm test:all        # Run all tests
```

See [Testing Strategy](testing-strategy.md) for details.

---

# Code Quality

```bash
pnpm lint            # Run ESLint on all packages
pnpm typecheck       # Run TypeScript type checking
pnpm format          # Format code with Prettier
pnpm format:check    # Check formatting without writing
```

---

# Building for Production

```bash
pnpm build           # Build all apps

# Deploy to Cloudflare (staging)
pnpm db:migrate:staging
npx wrangler deploy --env staging
npx wrangler pages deploy apps/web/dist --project-name bucketdrive --branch staging

# Deploy to production (via CI, triggered by v* tag)
npx wrangler deploy --env production
```

See [CI/CD](ci-cd.md) for the full pipeline.

---

# Project Structure

```txt
BucketDrive/
├── apps/
│   ├── web/              # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── components/   # ui/, layout/, features/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── routes/
│   │   │   └── stores/
│   │   └── ...
│   ├── api/              # Backend (Hono + Workers)
│   │   ├── src/
│   │   │   ├── modules/      # Domain modules (files, shares, etc.)
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   └── lib/          # Auth, DB, storage
│   │   └── .db/local.sqlite
│   └── workers/          # Background jobs (future)
├── packages/
│   └── shared/           # Types, Zod schemas, Drizzle schema
├── docs/                 # Documentation
├── scripts/              # Dev scripts (migrate, seed)
├── agents/               # Agent definitions
└── tooling/              # Shared ESLint/Prettier configs
```

---

# Troubleshooting

## `wrangler dev` fails with R2 binding error

Make sure your `wrangler.toml` has correct R2 bucket bindings and that the bucket exists:
```bash
npx wrangler r2 bucket create bucketdrive-dev
```

## D1 migrations fail

```bash
# Reset and re-apply migrations
rm apps/api/.db/local.sqlite
pnpm db:migrate:dev
pnpm db:seed
```

## OAuth callback URL mismatch

Verify the callback URLs exactly match:
- GitHub: `http://localhost:8787/api/auth/callback/github`
- Google: `http://localhost:8787/api/auth/callback/google`

## Better Auth session not persisting

Check that `BETTER_AUTH_SECRET` is set and consistent between restarts.
The session cookie requires HTTPS in production but works on `localhost` HTTP.

---

# References

- [README](/README.md)
- [Project Rules](/PROJECT_RULES.md)
- [Architecture Overview](system-overview.md)
- [Migration Strategy](../backend/migration-strategy.md)
- [Testing Strategy](testing-strategy.md)
- [CI/CD](ci-cd.md)
