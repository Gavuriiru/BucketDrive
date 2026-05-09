import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { workspace } from "./workspace"

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: text("metadata"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const uploadSession = sqliteTable("upload_session", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  userId: text("user_id").notNull(),
  bucketId: text("bucket_id").notNull(),
  status: text("status").notNull().default("initiated"),
  uploadType: text("upload_type").notNull().default("single"),
  totalSize: integer("total_size").notNull(),
  uploadedSize: integer("uploaded_size").notNull().default(0),
  storageKey: text("storage_key"),
  partsCompleted: integer("parts_completed").notNull().default(0),
  totalParts: integer("total_parts").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const uploadPart = sqliteTable("upload_part", {
  id: text("id").primaryKey(),
  uploadSessionId: text("upload_session_id")
    .notNull()
    .references(() => uploadSession.id, { onDelete: "cascade" }),
  partNumber: integer("part_number").notNull(),
  etag: text("etag").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedAt: text("uploaded_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const notification = sqliteTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})
