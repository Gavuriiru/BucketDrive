# Authentication Architecture

# Purpose

This document defines the authentication architecture for the platform.

The system uses **Better Auth** as the authentication provider, running directly in the
Cloudflare Worker alongside the API. Sessions are persisted in D1 via Drizzle ORM.

Authentication must be:

- secure (HTTPOnly cookies, CSRF protection)
- session-based (not stateless JWT stored in localStorage)
- bucket-role aware
- auditable (login events, session creation/revocation)

---

# Better Auth Overview

Better Auth is a TypeScript authentication library that provides:

- OAuth2/OIDC providers (GitHub, Google, extensible)
- Email/password credential authentication
- Session management with cookie-based tokens
- D1-backed user and session persistence
- Drizzle ORM adapter for D1/SQLite persistence
- Hono middleware for Cloudflare Workers

Better Auth runs **inside the Worker process** — no separate server needed.

---

# Authentication Flow

## Login (OAuth — GitHub example)

```txt
User clicks "Sign in with GitHub"
    ↓
Browser redirects to /api/auth/signin/github
    ↓
Better Auth redirects to GitHub OAuth
    ↓
User authorizes on GitHub
    ↓
GitHub redirects to /api/auth/callback/github
    ↓
Better Auth exchanges code for token
    ↓
Better Auth creates/updates user + session in D1
    ↓
Sets HTTPOnly session cookie (__bucketdrive_session)
    ↓
Redirects browser to /dashboard
```

## Login (Email/Password)

```txt
User submits email + password
    ↓
POST /api/auth/sign-in/email
    ↓
Better Auth validates credentials against D1
    ↓
Creates session in D1
    ↓
Sets HTTPOnly session cookie
    ↓
Returns session + user data
```

## Session Validation (protected routes)

```txt
Browser sends request with cookie
    ↓
Hono middleware calls auth.api.getSession(headers)
    ↓
Better Auth looks up session in D1
    ↓
Validates expiration
    ↓
Returns { user, session } or null
    ↓
If null → 401 Unauthorized
If valid → continue to RBAC middleware
```

## Logout

```txt
User clicks logout
    ↓
POST /api/auth/sign-out
    ↓
Better Auth deletes session from D1
    ↓
Clears session cookie
    ↓
Redirects to /login
```

---

# Session Configuration

```ts
// Better Auth config in Worker
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 1 day (refresh if close to expiry)
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  cookie: {
    name: "__bucketdrive_session",
    attributes: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    },
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
})
```

---

# Hono Integration

```ts
// apps/api/src/index.ts
import { Hono } from "hono"
import { auth } from "./lib/auth"
import { rbacMiddleware } from "./middleware/rbac"

const app = new Hono()

// Mount Better Auth handler
app.mount("/api/auth", auth.handler)

// Protected route example
app.get("/api/files", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    return c.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, 401)
  }

  // Access user + bucket role context
  const { user, session: sess } = session

  // Proceed with RBAC check
  // ...
})
```

---

# Token Architecture

Better Auth uses **database sessions** (not stateless JWTs):

- Session ID is stored in an HTTPOnly cookie
- Session data (userId, expiresAt, metadata) lives in D1
- No JWT parsing needed on the client — the cookie is sent automatically
- Revocation is instant: delete the session row from D1

### Why database sessions over stateless JWTs?

| Criterion         | Database Sessions                          | Stateless JWTs                              |
| ----------------- | ------------------------------------------ | ------------------------------------------- |
| Revocation        | Instant (delete row)                       | Requires blocklist or short expiry          |
| Token size        | Small (just session ID)                    | Large (all claims embedded)                 |
| Cookie security   | HTTPOnly (inaccessible to JS)              | Same if stored in cookie                    |
| Worker cold start | One D1 query                               | Zero queries (but validation still happens) |
| Role freshness    | Query the latest user role on each request | Must embed role claims or refetch           |

With D1's sub-10ms query latency on warm connections, the tradeoff favors database sessions
for revocation and role freshness.

---

# Bucket Role Integration

Better Auth owns identity and sessions. BucketDrive stores the application role on `user.role` and
the auth middleware attaches that role to the Hono context.

## Mapping to Internal RBAC

BucketDrive roles (`owner`, `admin`, `manager`, `editor`, `viewer`, `guest`) map to the internal
permission system defined in `docs/backend/rbac.md`:

```ts
// apps/api/src/middleware/rbac.ts
import { can } from "@bucketdrive/shared"

async function rbacMiddleware(c, next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ code: "UNAUTHORIZED" }, 401)

  const { user } = session

  // Attach to context
  c.set("user", user)
  c.set("role", user.role)

  await next()
}
```

---

# Audit Events

Authentication actions generate audit logs:

| Event                        | Logged data                                           |
| ---------------------------- | ----------------------------------------------------- |
| `user.login`                 | userId, provider (github/google/email), IP, userAgent |
| `user.login_failed`          | email, reason, IP                                     |
| `user.logout`                | userId, IP                                            |
| `session.refreshed`          | sessionId, userId                                     |
| `session.revoked`            | sessionId, actorId (admin who revoked)                |
| `bucket.invitation_accepted` | userId, invitationId                                  |

---

# Security Considerations

- Session cookies are HTTPOnly, Secure, SameSite=Strict — inaccessible to JavaScript
- Passwords are hashed with bcrypt (cost factor >= 12) by Better Auth
- OAuth state parameter prevents CSRF on OAuth callbacks
- Rate limiting on login endpoints: max 10 attempts per IP per 15 minutes
- Session invalidation on role change (admin demotes user → existing sessions invalidated)
- Backend permission checks use the latest stored user role; frontend state is not trusted

---

# Future Considerations

- MFA (TOTP) support via Better Auth plugin
- SSO / SAML for enterprise deployments
- Device session tracking (list active sessions, revoke specific devices)
- IP-based session restrictions
- Audit log export for compliance

---

# References

- [ADR-002: Better Auth](docs/decisions/ADR-002-better-auth.md)
- [Better Auth Documentation](https://www.better-auth.com/)
- [RBAC Architecture](docs/backend/rbac.md)
- [Data Model](docs/database/data-model.md)
