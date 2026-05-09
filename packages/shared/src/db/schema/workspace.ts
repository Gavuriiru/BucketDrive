import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const workspace = sqliteTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull(),
  storageQuotaBytes: integer("storage_quota_bytes").notNull().default(10 * 1024 * 1024 * 1024),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const workspaceSettings = sqliteTable("workspace_settings", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" })
    .unique(),
  defaultShareExpirationDays: integer("default_share_expiration_days").notNull().default(30),
  enablePublicSignup: integer("enable_public_signup", { mode: "boolean" }).notNull().default(false),
  trashRetentionDays: integer("trash_retention_days").notNull().default(30),
  maxFileSizeBytes: integer("max_file_size_bytes").notNull().default(5 * 1024 * 1024 * 1024),
  allowedMimeTypes: text("allowed_mime_types"),
  brandingLogoUrl: text("branding_logo_url"),
  brandingName: text("branding_name"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const bucket = sqliteTable("bucket", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("r2"),
  region: text("region"),
  visibility: text("visibility").notNull().default("private"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const fileObject = sqliteTable("file_object", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  bucketId: text("bucket_id")
    .notNull()
    .references(() => bucket.id),
  folderId: text("folder_id"),
  ownerId: text("owner_id").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  extension: text("extension"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  checksum: text("checksum"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const folder = sqliteTable("folder", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  parentFolderId: text("parent_folder_id"),
  name: text("name").notNull(),
  path: text("path").notNull(),
  createdBy: text("created_by").notNull(),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})
