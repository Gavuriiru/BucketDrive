# File Sharing Feature Specification

# Purpose

This document defines the file and folder sharing system.

The platform supports:
- internal sharing
- external direct sharing
- external explorer sharing

Sharing must remain:
- secure
- auditable
- revocable
- permission-aware
- easy to use

---

# Core Principles

## 1. Sharing Must Feel Simple

The sharing experience should feel:
- fast
- intuitive
- frictionless

Creating a share link should require minimal steps.

---

## 2. Security Is Mandatory

All sharing systems must support:
- expiration
- revocation
- access validation
- audit logging

Optional protections:
- password protection
- readonly restrictions

---

## 3. External Sharing Is Isolated

External users must NEVER:
- gain workspace access
- access unrelated resources
- infer internal metadata

External access remains sandboxed.

---

# Sharing Types

# 1. Internal Sharing

Sharing between authenticated workspace users.

Capabilities:
- readonly access
- editor access
- manager access

Internal sharing integrates with RBAC.

---

# 2. External Direct Sharing

Direct readonly download links.

Capabilities:
- optional password
- expiration
- direct download
- anonymous access

Designed for:
- quick file delivery
- public downloads
- temporary access

---

# 3. External Explorer Sharing

Readonly folder browsing interface.

Capabilities:
- folder navigation
- file previews
- individual downloads
- optional password
- expiration

Restrictions:
- no uploads
- no modifications
- no deletes
- no permission escalation

---

# Share Object

Each share is represented by:

```txt
ShareLink
```

Core fields:

```txt
id
resource_id
resource_type
share_type
created_by
permissions
expires_at
password_hash
is_active
created_at
updated_at
```

---

# Supported Resources

Sharing must support:
- files
- folders

Future support:
- collections
- workspaces
- smart folders

---

# Permission Model

Share permissions remain separate from RBAC.

External users do NOT receive:
- workspace permissions
- role inheritance

---

# Internal Share Permissions

Supported:

```txt
read
edit
manage
```

---

# External Share Permissions

Supported:

```txt
readonly
download
```

External sharing must NEVER allow:
- modification
- uploads
- permission management

---

# Share Creation Flow

```txt
User
    ↓
Open Share Modal
    ↓
Configure Access
    ↓
Optional Password
    ↓
Optional Expiration
    ↓
Backend Validation
    ↓
Share Creation
    ↓
Audit Log
    ↓
Copy Share URL
```

---

# Share URL Structure

Public URLs must:
- avoid exposing provider information
- avoid exposing internal paths
- use opaque identifiers

Recommended format:

```txt
/share/{shareId}
```

Avoid:
- predictable IDs
- raw storage paths

---

# Password Protection

Password protection is optional.

Rules:
- passwords must be hashed (bcrypt with salt rounds >= 12)
- passwords must NEVER be stored in plaintext
- password attempts must be rate limited
- password validation occurs server-side only

---

# Password Brute-Force Protection

Password-protected share links are vulnerable to brute-force attacks.
The system must implement layered protection:

## Rate Limiting Rules

| Attempts | Time Window | Consequence |
|---|---|---|
| 5 failed | 15 minutes | IP temporarily blocked from that share link |
| 10 failed (total) | Lifetime | Share link locked for 30 minutes |
| 50 failed (global) | 1 hour | IP temporarily banned across all share links for one week |

## Lock Mechanism

When a share link is locked due to brute-force:
1. All access attempts return `403 Forbidden` with `{"code": "SHARE_LOCKED"}`
2. The share creator receives a notification (if notifications enabled)
3. Admin users can see locked shares in the share dashboard
4. Lock auto-expires after 30 minutes

## Tracking

Failed and successful attempts are recorded in `ShareAccessAttempt`:
- `ip_address`: hashed for privacy, used for rate-limit windows
- `success: boolean`: successful password entry resets the failure counter for that IP
- `attempted_at`: timestamp for sliding window calculations

## Password Reset

Share creators may regenerate the password at any time:
- Old password is invalidated immediately
- Active signed URLs remain valid until expiry (they were already authorized)
- Reset generates an audit log event

---

# Expiration Rules

Shares may include expiration dates.

Expired shares must:
- immediately deny access
- invalidate signed URLs
- remain auditable

---

# Share Revocation

Users with permission may revoke shares.

Revocation must:
- invalidate access immediately
- invalidate active signed URLs when possible
- update frontend state
- generate audit logs

---

# Share Management

Users may manage:
- shares they created
- shares they own

Administrative users may manage:
- all workspace shares

---

# Share Dashboard

Users must have access to a sharing dashboard.

Capabilities:
- list active shares
- revoke shares
- edit expiration
- toggle password protection
- regenerate passwords
- copy links

Administrative users may:
- view all workspace shares
- audit external access

---

# Explorer Sharing UX

Readonly explorer pages must feel:
- polished
- lightweight
- desktop-like

Supported:
- folder navigation
- breadcrumbs
- previews
- downloads

Avoid:
- admin UI exposure
- internal metadata leakage

---

# External Viewer Restrictions

External viewers must NEVER:
- rename files
- upload files
- delete files
- access internal navigation
- access unrelated resources

Readonly isolation is mandatory.

---

# File Previews

Readonly explorer shares should support:
- image previews
- PDF previews
- video previews
- markdown previews

Future support:
- Office previews
- audio previews

---

# Download Behavior

Downloads should:
- use signed URLs
- remain temporary
- support large files

Avoid:
- permanent public storage URLs

---

# Access Validation

All share access requires validation:

1. Share exists
2. Share is active
3. Share is not expired
4. Password validation if enabled
5. Resource still exists

---

# Share Analytics

The platform should support:
- access counts
- download counts
- last accessed timestamp

Future support:
- geographic access analytics
- bandwidth analytics

---

# Audit Logging

Sharing actions must generate logs:

Required:
- share creation
- share access
- failed password attempts
- share revocation
- share updates

Audit logs must include:
- actor
- timestamp
- IP address
- resource
- action

---

# Security Rules

Sharing systems must:
- isolate external access
- prevent path traversal
- prevent unauthorized metadata exposure
- validate signed operations

Never expose:
- raw bucket paths
- provider URLs
- workspace internals

---

# Rate Limiting

Public share access should support:
- rate limiting
- abuse prevention
- password brute-force prevention

---

# UI Requirements

Sharing UI must support:
- dark mode
- keyboard navigation
- responsive layouts
- loading states
- error states

Required interactions:
- copy link
- expiration picker
- password toggle
- revoke action

---

# Modal Requirements

Share modals must:
- remain lightweight
- avoid excessive complexity
- support keyboard navigation

Avoid:
- giant forms
- nested modals

---

# Error Handling

Errors must be:
- understandable
- actionable
- secure

Avoid exposing:
- internal resource IDs
- backend implementation details

---

# Edge Cases

The system must handle:

- deleted resources
- expired links
- revoked shares
- invalid passwords
- moved files
- renamed folders
- missing permissions

---

# Moving Shared Resources

Moving shared resources should:
- preserve active shares
- preserve share validity

Avoid breaking share URLs unnecessarily.

---

# Renaming Shared Resources

Renaming resources should:
- preserve sharing
- preserve access history

---

# Deleting Shared Resources

Deleting resources should:
- invalidate shares
- preserve audit logs

---

# Future Scalability

The architecture must support future:
- upload-enabled shares
- collaborative shares
- expiring download quotas
- branded share pages
- email-based sharing
- realtime presence
- share comments
- activity feeds

The system must remain extensible.