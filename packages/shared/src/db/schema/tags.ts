import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { workspace, fileObject } from "./workspace"

export const fileTag = sqliteTable("file_tag", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})

export const fileObjectTag = sqliteTable("file_object_tag", {
  id: text("id").primaryKey(),
  fileObjectId: text("file_object_id")
    .notNull()
    .references(() => fileObject.id),
  tagId: text("tag_id")
    .notNull()
    .references(() => fileTag.id, { onDelete: "cascade" }),
})

export const favorite = sqliteTable("favorite", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  fileObjectId: text("file_object_id").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
})
