import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { workspace } from "./workspace"

export const shareLink = sqliteTable("share_link", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  shareType: text("share_type").notNull(),
  createdBy: text("created_by").notNull(),
  passwordHash: text("password_hash"),
  expiresAt: text("expires_at"),
  accessCount: integer("access_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  lastAccessedAt: text("last_accessed_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const sharePermission = sqliteTable("share_permission", {
  id: text("id").primaryKey(),
  shareLinkId: text("share_link_id")
    .notNull()
    .references(() => shareLink.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
})

export const shareAccessAttempt = sqliteTable("share_access_attempt", {
  id: text("id").primaryKey(),
  shareLinkId: text("share_link_id")
    .notNull()
    .references(() => shareLink.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  success: integer("success", { mode: "boolean" }).notNull(),
  attemptedAt: text("attempted_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})
