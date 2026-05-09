# Data Model

# Purpose

This document defines the core database architecture of the platform.

The database must support:
- multi-workspace isolation
- RBAC
- file management
- sharing systems
- audit logging
- scalable storage metadata

The schema must prioritize:
- consistency
- normalization
- scalability
- auditability
- predictable relationships

---

# Core Principles

## 1. Multi-Tenant Isolation

All tenant data must remain workspace-scoped.

Users must NEVER:
- access foreign workspace data
- infer foreign metadata
- bypass workspace isolation

Workspace isolation is mandatory.

---

## 2. Metadata-Only Storage

The database stores:
- metadata
- ownership
- permissions
- relationships

The database does NOT store:
- file binary contents

Binary data belongs to storage providers.

---

## 3. Consistent Naming

Naming must remain predictable.

Use:
- singular table names
- explicit relationships
- UUID primary keys

Avoid:
- abbreviations
- ambiguous names
- inconsistent terminology

---

# Primary Entities

# Workspace

Represents an isolated organizational unit.

## Fields

```txt
id
name
slug
owner_id
created_at
updated_at
```

---

# User

Represents authenticated users.

## Fields

```txt
id
email
name
avatar_url
status
created_at
updated_at
```

---

# WorkspaceMember

Represents user membership within a workspace.

## Fields

```txt
id
workspace_id
user_id
role_id
joined_at
```

A user may belong to multiple workspaces.

---

# Role

Represents permission bundles.

## Fields

```txt
id
workspace_id
name
description
is_system_role
created_at
```

Roles are workspace-scoped.

---

# Permission

Represents granular capabilities.

## Fields

```txt
id
resource
action
description
```

Examples:

```txt
files.read
files.write
shares.create
users.manage
```

---

# RolePermission

Maps permissions to roles.

## Fields

```txt
id
role_id
permission_id
```

---

# Bucket

Represents logical storage containers.

## Fields

```txt
id
workspace_id
name
provider
region
visibility
created_at
```

Buckets are workspace-scoped.

---

# Folder

Represents virtual folders.

## Fields

```txt
id
workspace_id
parent_folder_id
name
path
created_by
created_at
updated_at
```

Folders are virtual metadata structures.

---

# FileObject

Represents stored files.

## Fields

```txt
id
workspace_id
bucket_id
folder_id
owner_id
storage_key
original_name
mime_type
extension
size_bytes
checksum
is_deleted
created_at
updated_at
```

The storage_key references object storage.

---

# FileTag

Represents reusable tags.

## Fields

```txt
id
workspace_id
name
color
created_at
```

---

# FileObjectTag

Many-to-many relationship.

## Fields

```txt
id
file_object_id
tag_id
```

---

# Favorite

Represents user favorites.

## Fields

```txt
id
user_id
file_object_id
created_at
```

---

# ShareLink

Represents external or internal sharing.

## Fields

```txt
id
workspace_id
resource_type
resource_id
share_type
created_by
password_hash
expires_at
is_active
created_at
updated_at
```

---

# SharePermission

Represents share capabilities.

## Fields

```txt
id
share_link_id
permission
```

Examples:

```txt
readonly
download
edit
```

---

# AuditLog

Represents security and activity logs.

## Fields

```txt
id
workspace_id
actor_id
action
resource_type
resource_id
ip_address
user_agent
metadata
created_at
```

Audit logs must remain append-only whenever possible.

---

# UploadSession

Represents multipart/resumable uploads.

## Fields

```txt
id
workspace_id
user_id
bucket_id
status
upload_type
total_size
uploaded_size
created_at
updated_at
```

---

# UploadPart

Represents multipart upload chunks.

## Fields

```txt
id
upload_session_id
part_number
etag
size_bytes
uploaded_at
```

---

# Notification

Represents user notifications.

## Fields

```txt
id
user_id
type
title
message
is_read
created_at
```

---

# Relationships

# Workspace Relationships

```txt
Workspace
 ├── Users
 ├── Roles
 ├── Buckets
 ├── Folders
 ├── Files
 ├── Shares
 └── AuditLogs
```

---

# File Relationships

```txt
Folder
 └── FileObjects

FileObject
 ├── Tags
 ├── Favorites
 ├── Shares
 └── Audit Logs
```

---

# Authorization Relationships

```txt
User
 └── WorkspaceMember
      └── Role
           └── Permissions
```

---

# Share Relationships

```txt
ShareLink
 └── SharePermissions
```

---

# UUID Rules

All primary IDs must use:
- UUID
or
- ULID

Avoid:
- sequential numeric IDs

Reasons:
- enumeration protection
- distributed safety
- scalability

---

# Timestamp Rules

All important entities should include:

```txt
created_at
updated_at
```

Soft-delete entities should include:

```txt
deleted_at
```

---

# Soft Delete Rules

Files and folders should support soft deletion.

Soft delete enables:
- trash recovery
- audit preservation
- rollback capability

Avoid hard deletion by default.

---

# Ownership Rules

Ownership must remain explicit.

Resources should track:
- creator
- owner
- workspace scope

Ownership does NOT replace RBAC.

---

# Indexing Strategy

Indexes are mandatory for:

```txt
workspace_id
owner_id
folder_id
created_at
updated_at
storage_key
```

Additional indexes required for:
- search
- sorting
- filtering
- audit logs

---

# Search Architecture

Search should support:
- filenames
- tags
- mime types
- metadata

Future support:
- full-text indexing
- OCR indexing
- semantic search

---

# Quota Tracking

Storage analytics should support:
- workspace usage
- user usage
- trash usage
- future version usage

Avoid expensive real-time recalculations when possible.

---

# Audit Architecture

Audit logs must remain:
- append-oriented
- immutable when possible
- queryable

Audit records should never be silently deleted.

---

# File Versioning Future Support

The schema must support future:
- file versions
- rollback
- change history

Recommended future entity:

```txt
FileVersion
```

---

# Activity Feed Future Support

The architecture should support:
- activity feeds
- realtime updates
- collaboration events

---

# Notification Future Support

Notifications should support:
- uploads
- shares
- mentions
- permission changes

---

# Multi-Region Future Support

The architecture should support future:
- regional storage
- replication
- failover

Avoid hardcoded regional assumptions.

---

# Forbidden Database Practices

Never:
- use ambiguous naming
- store binary file contents
- duplicate authorization data unnecessarily
- tightly couple provider metadata
- use sequential public IDs
- bypass workspace scoping

Avoid:
- giant denormalized tables
- inconsistent foreign key naming
- implicit relationships

---

# Recommended Naming Conventions

Primary keys:

```txt
id
```

Foreign keys:

```txt
workspace_id
user_id
folder_id
bucket_id
```

Avoid:
- mixed naming conventions
- inconsistent suffixes

---

# Recommended Constraints

Use:
- foreign keys
- unique constraints
- check constraints

Examples:
- unique workspace slugs
- unique storage keys
- valid expiration ranges

---

# Recommended Query Rules

Queries must:
- remain workspace-scoped
- avoid N+1 patterns
- support pagination

Avoid:
- loading entire datasets
- unrestricted scans

---

# Scalability Philosophy

The schema must support future:
- billions of files
- large workspaces
- enterprise RBAC
- audit-heavy environments
- realtime collaboration

The architecture must remain extensible.

---

# Final Rule

Whenever uncertain:
prioritize:
- consistency
- explicit relationships
- auditability
- scalability
over convenience.