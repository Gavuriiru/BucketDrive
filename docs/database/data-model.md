# Data Model

# Purpose

This document describes the current BucketDrive v1 database model.

BucketDrive v1 is a single-bucket drive platform. The original multi-workspace schema was
collapsed by the single-bucket migration, so user roles, files, folders, shares, tags, audit logs,
settings, uploads, and notifications are scoped to the default bucket/platform instance rather than
to independent workspace tenants.

The database supports:

- file and folder metadata
- global user roles and permission checks
- sharing systems
- upload sessions and multipart upload parts
- trash retention and cleanup
- audit logging
- platform and bucket settings

The database stores metadata only. Binary file contents live in Cloudflare R2.

---

# Current Scope

## Bucket

Represents the single logical storage container managed by the app.

```txt
id
name
provider
region
visibility
created_at
```

`bucket` is the root scope for storage settings and file metadata.

## BucketSettings

Stores configurable operational settings for the bucket.

```txt
id
bucket_id
storage_quota_bytes
default_share_expiration_days
enable_public_signup
trash_retention_days
max_file_size_bytes
upload_chunk_size_bytes
allowed_mime_types
branding_logo_url
branding_logo_key
branding_name
r2_public_base_url
r2_last_sync_at
r2_sync_status
r2_sync_error
created_at
updated_at
```

## PlatformSettings

Stores global platform branding and signup policy.

```txt
id
platform_name
enable_public_signup
logo_key
favicon_key
created_at
updated_at
```

## User

Represents authenticated users and their global bucket role.

```txt
id
email
name
email_verified
image
is_platform_admin
can_create_workspaces
role
created_at
updated_at
```

`role` is global in v1. The app does not currently maintain per-workspace membership rows for
authorization.

## FileObject

Represents stored files.

```txt
id
bucket_id
folder_id
owner_id
storage_key
original_name
mime_type
extension
size_bytes
checksum
thumbnail_key
metadata
is_deleted
deleted_at
created_at
updated_at
```

`storage_key` points to the object in R2.

## Folder

Represents virtual folders.

```txt
id
parent_folder_id
name
path
created_by
is_deleted
deleted_at
created_at
updated_at
```

Folder paths are metadata only; R2 remains object-key based.

## FileTag

Represents reusable file tags.

```txt
id
name
color
created_at
updated_at
```

## FileObjectTag

Maps files to tags.

```txt
id
file_object_id
tag_id
```

## Favorite

Represents user-specific favorite files.

```txt
id
user_id
file_object_id
is_active
created_at
```

## ShareLink

Represents internal legacy shares and external direct/explorer links.

```txt
id
resource_type
resource_id
share_type
created_by
password_hash
expires_at
access_count
last_accessed_at
is_active
created_at
updated_at
```

External shares use opaque IDs and can be password protected.

## SharePermission

Represents share capabilities.

```txt
id
share_link_id
permission
```

The v1 UI focuses on external readonly/download links.

## ShareAccessAttempt

Tracks public share password attempts.

```txt
id
share_link_id
ip_address
user_agent
success
attempted_at
```

Used for brute-force protection and access analytics.

## UploadSession

Represents single-part and multipart uploads.

```txt
id
user_id
bucket_id
status
upload_type
total_size
uploaded_size
storage_key
total_parts
parts_completed
created_at
updated_at
```

## UploadPart

Represents uploaded multipart chunks.

```txt
id
upload_session_id
part_number
etag
size_bytes
uploaded_at
```

## AuditLog

Represents security and activity logs.

```txt
id
bucket_id
actor_id
action
resource_type
resource_id
ip_address
user_agent
metadata
created_at
```

Audit logs should remain append-only when possible.

## Notification

Represents in-app notifications.

```txt
id
user_id
type
title
message
is_read
created_at
```

## BucketInvitation

Represents invitations to join the bucket.

```txt
id
email
token
role
invited_by
status
expires_at
accepted_at
created_at
updated_at
```

---

# Search Index

Search uses the `file_search_idx` FTS5 virtual table maintained by migrations and triggers.
After the single-bucket migration, the index stores:

```txt
file_id
original_name
extension
mime_type
```

Search queries filter deleted files and hydrate tags/favorites from normal tables.

---

# Relationships

```txt
Bucket
 ├── BucketSettings
 ├── FileObjects
 ├── UploadSessions
 └── AuditLogs

Folder
 ├── Folders
 └── FileObjects

FileObject
 ├── FileObjectTags
 ├── Favorites
 ├── ShareLinks
 └── AuditLogs

User
 ├── owned FileObjects
 ├── Favorites
 ├── BucketInvitations
 └── Notifications
```

---

# Future Work

Full multi-workspace isolation would require a new migration and API pass that reintroduces
workspace-scoped resources, workspace memberships, per-workspace roles, and tenant filtering across
all queries. That is not part of the current v1 model.
