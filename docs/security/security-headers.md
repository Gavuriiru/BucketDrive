# Security Headers

# Purpose

This document defines the concrete security headers applied to all HTTP responses
from the platform. Headers are configured at two layers:

1. **Cloudflare Pages / Workers** — applied at the edge via `_headers` file or middleware
2. **Hono Middleware** — applied programmatically in the Worker for dynamic responses

Security headers are mandatory for all responses. Never ship a response without them.

---

# Required Headers

## Content-Security-Policy (CSP)

Restricts which resources the browser can load and execute.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https: data: blob:;
  font-src 'self';
  connect-src 'self' https://*.cloudflare.com;
  media-src 'self' blob:;
  object-src 'none';
  frame-src 'none';
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  upgrade-insecure-requests;
```

**Rationale**:
- `default-src 'self'` — block all external resources by default
- `script-src 'self'` — no inline scripts, no external scripts
- `style-src 'unsafe-inline'` — required by TailwindCSS (generates inline styles)
- `img-src https: data: blob:` — allow images from any HTTPS source (thumbnails, previews)
- `connect-src *.cloudflare.com` — allow API calls to Cloudflare Workers
- `frame-ancestors 'none'` — prevent clickjacking via iframe embedding
- `object-src 'none'` — block Flash/Java plugins

---

## Strict-Transport-Security (HSTS)

Enforces HTTPS for all connections.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Rationale**:
- `max-age=31536000` — 1 year, browser remembers to always use HTTPS
- `includeSubDomains` — applies to all subdomains
- `preload` — eligible for browser HSTS preload list

---

## X-Frame-Options

Legacy clickjacking protection (redundant with CSP `frame-ancestors`, but added for older browsers).

```
X-Frame-Options: DENY
```

---

## X-Content-Type-Options

Prevents MIME type sniffing.

```
X-Content-Type-Options: nosniff
```

---

## Referrer-Policy

Controls how much referrer information is sent with requests.

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Rationale**: Sends the origin (not full URL) to cross-origin requests, nothing on downgrade.

---

## Permissions-Policy

Restricts browser features the page can use.

```
Permissions-Policy:
  camera=(),
  microphone=(),
  geolocation=(),
  payment=(),
  usb=(),
  bluetooth=(),
  autoplay=(self),
  fullscreen=(self),
  clipboard-read=(self),
  clipboard-write=(self)
```

**Rationale**: Disable everything by default, enable only what the platform needs.
The platform uses clipboard for "Copy share link" and fullscreen for video preview.

---

## Cross-Origin-Resource-Policy

Restricts which sites can embed the resource.

```
Cross-Origin-Resource-Policy: same-origin
```

---

## X-XSS-Protection

Legacy XSS protection (deprecated in modern browsers, but kept for compatibility).

```
X-XSS-Protection: 0
```

**Rationale**: Set to `0` to disable the problematic legacy XSS auditor. CSP handles XSS protection.

---

# CORS Configuration

CORS headers are applied by Cloudflare Workers for API endpoints.

## API Endpoints (`/api/*`)

```
Access-Control-Allow-Origin: https://{domain}
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

- `Allow-Origin` is the production frontend domain (dynamic per environment)
- `Allow-Credentials: true` required for session cookies
- `Allow-Methods` limited to actually used HTTP methods
- `Max-Age: 86400` — cache CORS preflight for 24 hours

## Public Share Endpoints (`/share/*`)

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

- Public endpoints allow any origin (external users access share links)
- Credentials not allowed (public access is anonymous)
- Only GET (view/download) and POST (password validation) are permitted

---

# Implementation

## Static Assets (Cloudflare Pages)

`apps/web/public/_headers`:

```txt
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self' https://*.cloudflare.com; media-src 'self' blob:; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; upgrade-insecure-requests;
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), autoplay=(self), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)
  Cross-Origin-Resource-Policy: same-origin
```

## API Responses (Hono Middleware)

```ts
// apps/api/src/middleware/security-headers.ts
import { createMiddleware } from "hono/factory"

export const securityHeaders = createMiddleware(async (c, next) => {
  await next()

  c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  c.res.headers.set("X-Content-Type-Options", "nosniff")
  c.res.headers.set("X-Frame-Options", "DENY")
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  c.res.headers.set("X-XSS-Protection", "0")
  c.res.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  // CSP for API (API responses are JSON, not HTML — CSP still valuable)
  c.res.headers.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'"
  )
})
```

---

# Environment-Specific Configuration

| Header | Development | Production |
|---|---|---|
| HSTS `max-age` | Omit HSTS entirely | 31536000 (1 year) |
| CSP `upgrade-insecure-requests` | Omit (dev uses `http://localhost`) | Include |
| CORS `Allow-Origin` | `http://localhost:5173` (Vite dev server) | `https://{domain}` |
| Cookie `Secure` | `false` (localhost HTTP) | `true` |

---

# Validation

Headers should be validated in CI using:

```bash
# Check that production responses include all required headers
curl -sI https://{domain}/ | grep -E "content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy"
```

---

# References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Security Agent Rules](../agents/security-agent.md)
