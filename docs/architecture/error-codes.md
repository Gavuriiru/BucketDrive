# Error Codes

# Purpose

This document defines every error code the platform can return, with:
- HTTP status code
- Default message
- Frontend action (what the UI should do)

Error codes are shared between frontend and backend via `packages/shared/src/schemas/common.ts`.
This ensures consistent handling across the entire platform.

---

# Error Response Structure

All errors follow this shape:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {
    "field": "optional_field_name",
    "constraint": "optional_constraint_name"
  }
}
```

The `details` object is optional and provides structured context for the frontend
(e.g., which form field has a validation error, remaining retry count, etc.).

---

# Authentication Errors (4xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | "Authentication required" | Redirect to `/login`. Preserve return URL. |
| `SESSION_EXPIRED` | 401 | "Session expired" | Redirect to `/login`. Show toast: "Session expired, please sign in again." |
| `INVALID_CREDENTIALS` | 401 | "Invalid email or password" | Show error message below password field. |
| `SESSION_REVOKED` | 401 | "Session was revoked" | Redirect to `/login`. Show toast explaining the session was revoked. |
| `MFA_REQUIRED` | 401 | "Multi-factor authentication required" | Redirect to MFA challenge page. (Future) |

---

# Authorization Errors (4xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `FORBIDDEN` | 403 | "You don't have permission to perform this action" | Toast: "You don't have permission." Hide the triggering UI element. |
| `WORKSPACE_ACCESS_DENIED` | 403 | "You don't have access to this workspace" | Redirect to workspace list or show empty state. |
| `OWNER_REQUIRED` | 403 | "Only the workspace owner can perform this action" | Show toast explaining ownership requirement. |
| `ROLE_TOO_LOW` | 403 | "Your role doesn't allow assigning this role" | Toast: "You cannot assign a role higher than your own." |
| `CANNOT_MODIFY_SELF` | 403 | "You cannot modify your own role" | Toast: "You cannot change your own role." |

---

# Resource Errors (4xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `NOT_FOUND` | 404 | "Resource not found" | Show 404 page or empty state. |
| `FILE_NOT_FOUND` | 404 | "File not found" | Redirect to parent folder, toast explaining. |
| `FOLDER_NOT_FOUND` | 404 | "Folder not found" | Redirect to root or show empty state. |
| `WORKSPACE_NOT_FOUND` | 404 | "Workspace not found" | Redirect to workspace list. |
| `USER_NOT_FOUND` | 404 | "User not found" | Show error toast. |
| `CONFLICT` | 409 | "Resource already exists" | Show inline error on the conflicting field. |
| `FOLDER_EXISTS` | 409 | "A folder with this name already exists" | Show inline error on folder name field. |
| `FILE_EXISTS` | 409 | "A file with this name already exists" | Show inline rename prompt or suggest alternative. |
| `USER_ALREADY_MEMBER` | 409 | "User is already a member of this workspace" | Show toast. |
| `INVITATION_ALREADY_SENT` | 409 | "An invitation has already been sent to this email" | Show toast with option to resend. |
| `RESOURCE_DELETED` | 410 | "This resource has been deleted" | Redirect to parent folder or trash view. |
| `RESOURCE_MOVED` | 410 | "This resource has been moved" | Show current location or redirect. |

---

# Validation Errors (4xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | "Validation failed" | Show field-level errors using `details.field`. |
| `INVALID_UUID` | 400 | "Invalid identifier format" | Toast: "Invalid reference." (Likely a bug, report to dev). |
| `REQUIRED_FIELD` | 400 | "{field} is required" | Highlight required field. |
| `INVALID_EMAIL` | 400 | "Invalid email address" | Show error on email field. |
| `INVALID_URL` | 400 | "Invalid URL" | Show error on URL field. |
| `MIN_LENGTH` | 400 | "{field} must be at least {min} characters" | Show character count / error on field. |
| `MAX_LENGTH` | 400 | "{field} must not exceed {max} characters" | Show character count / error on field. |
| `INVALID_FILE_NAME` | 400 | "File name contains invalid characters" | Show error on upload dialog. |

---

# Upload Errors (4xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `FILE_TOO_LARGE` | 413 | "File exceeds the maximum size of {maxSize}" | Show max file size in upload error. Disable upload for that file. |
| `QUOTA_EXCEEDED` | 413 | "Workspace storage quota exceeded" | Show quota usage stats + upgrade CTA. |
| `BLOCKED_EXTENSION` | 400 | "File type {extension} is not allowed" | Show error with allowed types. |
| `BLOCKED_MIME` | 400 | "This type of file is not allowed" | Show error with allowed MIME categories. |
| `INVALID_NAME` | 400 | "File name contains invalid characters" | Show error suggesting safe naming. |
| `UPLOAD_SESSION_EXPIRED` | 410 | "Upload session has expired" | Restart upload from beginning. Show toast. |
| `UPLOAD_INCOMPLETE` | 400 | "Not all parts have been uploaded" | Resume upload from missing parts. |

---

# Share Errors (4xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `SHARE_NOT_FOUND` | 404 | "Share link not found" | Show "This link doesn't exist" page. |
| `SHARE_EXPIRED` | 410 | "This share link has expired" | Show "Link expired" page with contact option. |
| `SHARE_REVOKED` | 410 | "This share link has been revoked" | Show "Link no longer available" page. |
| `SHARE_LOCKED` | 403 | "Share is temporarily locked due to too many failed password attempts. Try again in {minutes} minutes." | Show countdown timer. Disable password input. |
| `INVALID_PASSWORD` | 401 | "Incorrect password. {remaining} attempts remaining." | Show error on password field with remaining count. |
| `PASSWORD_REQUIRED` | 401 | "This share requires a password" | Show password input. |
| `SHARE_CREATE_FAILED` | 400 | "Could not create share link" | Show toast with reason. |

---

# Rate Limiting Errors (4xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `RATE_LIMITED` | 429 | "Too many requests. Try again in {seconds} seconds." | Show countdown timer. Disable action buttons. |
| `LOGIN_RATE_LIMITED` | 429 | "Too many login attempts. Try again in {minutes} minutes." | Show countdown. Disable login form. |
| `UPLOAD_RATE_LIMITED` | 429 | "Too many uploads. Try again in {seconds} seconds." | Pause upload queue. Show countdown. |
| `SHARE_PASSWORD_RATE_LIMITED` | 429 | "Too many password attempts. This share is temporarily locked." | Show lock countdown. Redirect to share lock page. |

---

# Server Errors (5xx)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `INTERNAL_ERROR` | 500 | "An unexpected error occurred" | Toast: "Something went wrong. Please try again." + "Retry" button. |
| `SERVICE_UNAVAILABLE` | 503 | "Service temporarily unavailable" | Toast: "Service is down for maintenance. Check back soon." |
| `STORAGE_ERROR` | 502 | "Storage service error" | Toast: "Could not access files. Retrying..." + auto-retry. |
| `DATABASE_ERROR` | 500 | "Database error" | Toast: generic error. Log to monitoring. |

---

# WebSocket / Realtime Errors (Future)

| Code | HTTP | Message | Frontend Action |
|---|---|---|---|
| `CONNECTION_LOST` | — | "Connection lost. Reconnecting..." | Show reconnecting indicator. Auto-reconnect. |
| `CONNECTION_REESTABLISHED` | — | "Reconnected" | Toast (subtle, auto-dismiss). Refresh stale data. |

---

# Shared TypeScript Types

```ts
// packages/shared/src/schemas/common.ts
import { z } from "zod"

export const ErrorCode = z.enum([
  // Auth
  "UNAUTHORIZED",
  "SESSION_EXPIRED",
  "INVALID_CREDENTIALS",
  "SESSION_REVOKED",
  "MFA_REQUIRED",

  // Authorization
  "FORBIDDEN",
  "WORKSPACE_ACCESS_DENIED",
  "OWNER_REQUIRED",
  "ROLE_TOO_LOW",
  "CANNOT_MODIFY_SELF",

  // Resources
  "NOT_FOUND",
  "FILE_NOT_FOUND",
  "FOLDER_NOT_FOUND",
  "WORKSPACE_NOT_FOUND",
  "USER_NOT_FOUND",
  "CONFLICT",
  "FOLDER_EXISTS",
  "FILE_EXISTS",
  "USER_ALREADY_MEMBER",
  "INVITATION_ALREADY_SENT",
  "RESOURCE_DELETED",
  "RESOURCE_MOVED",

  // Validation
  "VALIDATION_ERROR",
  "INVALID_UUID",
  "REQUIRED_FIELD",
  "INVALID_EMAIL",
  "INVALID_URL",
  "MIN_LENGTH",
  "MAX_LENGTH",
  "INVALID_FILE_NAME",

  // Upload
  "FILE_TOO_LARGE",
  "QUOTA_EXCEEDED",
  "BLOCKED_EXTENSION",
  "BLOCKED_MIME",
  "INVALID_NAME",
  "UPLOAD_SESSION_EXPIRED",
  "UPLOAD_INCOMPLETE",

  // Share
  "SHARE_NOT_FOUND",
  "SHARE_EXPIRED",
  "SHARE_REVOKED",
  "SHARE_LOCKED",
  "INVALID_PASSWORD",
  "PASSWORD_REQUIRED",
  "SHARE_CREATE_FAILED",

  // Rate limiting
  "RATE_LIMITED",
  "LOGIN_RATE_LIMITED",
  "UPLOAD_RATE_LIMITED",
  "SHARE_PASSWORD_RATE_LIMITED",

  // Server
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
  "STORAGE_ERROR",
  "DATABASE_ERROR",
])

export type ErrorCode = z.infer<typeof ErrorCode>

export const ApiErrorSchema = z.object({
  code: ErrorCode,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>
```

---

# Frontend Error Handler

```ts
// apps/web/src/lib/error-handler.ts
import { toast } from "@bucketdrive/ui/toast"
import type { ApiError } from "@bucketdrive/shared"

export function handleApiError(error: ApiError) {
  switch (error.code) {
    case "UNAUTHORIZED":
    case "SESSION_EXPIRED":
      window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`
      break

    case "FORBIDDEN":
      toast.error("You don't have permission to perform this action")
      break

    case "RATE_LIMITED": {
      const seconds = error.details?.retryAfter as number ?? 60
      toast.error(`Too many requests. Try again in ${seconds}s`)
      break
    }

    case "QUOTA_EXCEEDED":
      toast.error("Storage quota exceeded", {
        description: "Upgrade your plan to upload more files.",
        action: { label: "View Plans", onClick: () => window.location.href = "/billing" },
      })
      break

    case "SHARE_LOCKED": {
      const minutes = error.details?.retryAfterMinutes as number ?? 30
      toast.error(`Share is locked for ${minutes} minutes due to too many failed attempts`)
      break
    }

    case "SHARE_EXPIRED":
    case "SHARE_REVOKED":
      // On share page, show full-page message
      break

    case "INVALID_PASSWORD": {
      const remaining = error.details?.remaining as number ?? 0
      toast.error(`Incorrect password. ${remaining} attempts remaining.`)
      break

    case "VALIDATION_ERROR":
      // Handled per-form by React Hook Form
      break

    case "INTERNAL_ERROR":
    default:
      toast.error("Something went wrong. Please try again.")
      break
  }
}
```

---

# Backend Error Helper

```ts
// apps/api/src/lib/errors.ts
import type { ErrorCode } from "@bucketdrive/shared"

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "AppError"
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

// Factory functions
export const Errors = {
  unauthorized: (msg = "Authentication required") =>
    new AppError("UNAUTHORIZED", msg, 401),
  forbidden: (msg = "Permission denied") =>
    new AppError("FORBIDDEN", msg, 403),
  notFound: (msg = "Resource not found") =>
    new AppError("NOT_FOUND", msg, 404),
  conflict: (msg = "Resource already exists") =>
    new AppError("CONFLICT", msg, 409),
  validation: (msg: string, details?: Record<string, unknown>) =>
    new AppError("VALIDATION_ERROR", msg, 400, details),
  quotaExceeded: (msg = "Storage quota exceeded") =>
    new AppError("QUOTA_EXCEEDED", msg, 413),
  internal: (msg = "Internal server error") =>
    new AppError("INTERNAL_ERROR", msg, 500),
  // ... all other factory functions
}
```

Usage in Hono route handlers:

```ts
app.post("/api/workspaces/:id/files/upload", async (c) => {
  const used = await getUsedBytes(workspaceId)
  if (used + sizeBytes > quotaBytes) {
    throw Errors.quotaExceeded(
      `Workspace quota exceeded. Used: ${used}, Limit: ${quotaBytes}`
    )
  }
  // ...
})
```

---

# References

- [API Contracts](api-contracts.md)
- [Security Headers](../security/security-headers.md)
- [RBAC Architecture](../backend/rbac.md)
- [File Sharing — Error Handling](../features/file-sharing.md#error-handling)
