# Bucket Membership And Administration

# Purpose

This document describes the current BucketDrive v1 administration model.

BucketDrive v1 uses a single default bucket. The route names still use `/workspaces` for API
compatibility, but the product does not currently expose multiple isolated workspaces. A user's role
is global for the bucket.

---

# Current Model

## Single Bucket Context

`GET /api/workspaces` returns the default bucket as the only selectable context:

```txt
id
name
slug: "bucket"
ownerId
role
storageQuotaBytes
createdAt
updatedAt
```

Frontend routes and API clients use this ID as the bucket context for files, folders, members,
shares, trash, search, notifications, batch actions, and dashboard data.

## Roles

Roles are stored on the `user.role` column and evaluated through the shared `can()` permission
engine.

```txt
owner
admin
manager
editor
viewer
guest
```

The backend remains the source of truth for authorization. Frontend permission checks are only UX
helpers.

## Membership

Admins and owners can invite users into the bucket. Invitations create `bucket_invitation` records
with expiring tokens. Accepting an invitation assigns the invited user's global bucket role.

Current endpoints:

```txt
GET    /api/workspaces/:id/members
POST   /api/workspaces/:id/members
PATCH  /api/workspaces/:id/members/:memberId
DELETE /api/workspaces/:id/members/:memberId

GET    /api/workspaces/:id/invitations
POST   /api/workspaces/:id/invitations
DELETE /api/workspaces/:id/invitations/:invitationId

GET    /api/invitations/:token
POST   /api/invitations/:token/accept
```

## Ownership Transfer

Ownership transfer is immediate in v1. The current owner can transfer ownership to an existing admin.

```txt
POST /api/workspaces/:id/transfer-ownership
body: { newOwnerId }
```

The previous owner becomes admin, the target admin becomes owner, and an audit event is written.

## Settings

Bucket-level settings are managed from the dashboard settings route.

| Setting                      | Default | Description                               |
| ---------------------------- | ------- | ----------------------------------------- |
| `storageQuotaBytes`          | 10 GB   | Total bucket quota enforced on upload     |
| `defaultShareExpirationDays` | 30      | Default expiration for new share links    |
| `enablePublicSignup`         | false   | Bucket-level signup/join policy           |
| `trashRetentionDays`         | 30      | Days before deleted items are purged      |
| `maxFileSizeBytes`           | 5 GB    | Maximum accepted file size                |
| `uploadChunkSizeBytes`       | 5 MB    | Multipart upload part size floor          |
| `allowedMimeTypes`           | empty   | Optional upload MIME allow list           |
| `brandingName`               | null    | Public share branding override            |
| `brandingLogoUrl`            | null    | Public share branding logo URL            |
| `r2PublicBaseUrl`            | null    | Optional public R2 base URL for downloads |

---

# Platform Administration

Platform admins can manage global branding and signup behavior:

```txt
GET   /api/platform/settings
PATCH /api/platform/settings
POST  /api/platform/assets/:kind
GET   /api/platform/invitations
POST  /api/platform/invitations
POST  /api/platform/invitations/:token/accept
```

`PLATFORM_OWNER_EMAIL` can promote the initial platform owner during first-run setup.

---

# Not In v1

The following behaviors appear in older planning docs but are not part of the current product:

- creating multiple independent workspaces
- per-workspace memberships
- per-workspace roles for the same user
- workspace suspension/reactivation
- workspace soft-delete and purge lifecycle
- billing-tier workspace limits

Adding those would be a separate multi-tenant architecture project.
