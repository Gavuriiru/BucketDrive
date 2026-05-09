import initSqlJs from "sql.js"
import { drizzle } from "drizzle-orm/sql-js"
import * as schema from "@bucketdrive/shared/db/schema"
import { v4 as uuid } from "uuid"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"

const DB_PATH = resolve(__dirname, "../apps/api/.db/local.sqlite")

async function main() {
  console.log("Seeding database...")

  const SQL = await initSqlJs()

  if (!existsSync(DB_PATH)) {
    console.error("Database file not found. Run pnpm db:migrate:dev first.")
    process.exit(1)
  }

  const dbBuffer = readFileSync(DB_PATH)
  const sqlite = new SQL.Database(dbBuffer)

  sqlite.run("PRAGMA foreign_keys = ON")

  const db = drizzle(sqlite, { schema })

  const wsId = uuid()
  const ownerId = uuid()
  const bucketId = uuid()

  db.insert(schema.workspace).values({
    id: wsId,
    name: "Development Workspace",
    slug: "dev",
    ownerId,
    storageQuotaBytes: 10 * 1024 * 1024 * 1024,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run()

  db.insert(schema.workspaceSettings).values({
    id: uuid(),
    workspaceId: wsId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run()

  db.insert(schema.workspaceMember).values({
    id: uuid(),
    workspaceId: wsId,
    userId: ownerId,
    role: "owner",
    createdAt: new Date().toISOString(),
  }).run()

  db.insert(schema.bucket).values({
    id: bucketId,
    workspaceId: wsId,
    name: "Default",
    provider: "r2",
    createdAt: new Date().toISOString(),
  }).run()

  const rootFolderId = uuid()

  db.insert(schema.folder).values({
    id: rootFolderId,
    workspaceId: wsId,
    parentFolderId: null,
    name: "Documents",
    path: "/Documents",
    createdBy: ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run()

  const sampleFiles = [
    { name: "project-proposal.pdf", mime: "application/pdf", ext: ".pdf", size: 245000 },
    { name: "budget-2025.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx", size: 89000 },
    { name: "team-photo.png", mime: "image/png", ext: ".png", size: 3200000 },
    { name: "meeting-notes.md", mime: "text/markdown", ext: ".md", size: 4200 },
    { name: "presentation.pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ".pptx", size: 5600000 },
  ]

  for (const file of sampleFiles) {
    db.insert(schema.fileObject).values({
      id: uuid(),
      workspaceId: wsId,
      bucketId,
      folderId: rootFolderId,
      ownerId,
      storageKey: `workspace/${wsId}/files/${uuid()}`,
      originalName: file.name,
      mimeType: file.mime,
      extension: file.ext,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run()
  }

  const tagColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]
  const tagNames = ["Important", "Draft", "Final", "Archived", "Review"]

  for (let i = 0; i < tagNames.length; i++) {
    db.insert(schema.fileTag).values({
      id: uuid(),
      workspaceId: wsId,
      name: tagNames[i]!,
      color: tagColors[i]!,
      createdAt: new Date().toISOString(),
    }).run()
  }

  const data = sqlite.export()
  writeFileSync(DB_PATH, Buffer.from(data))

  console.log(`Seeded workspace: ${wsId}`)
  console.log(`  Owner ID: ${ownerId}`)
  console.log(`  Files: ${sampleFiles.length}`)
  console.log(`  Tags: ${tagNames.length}`)

  sqlite.close()
}

main().catch(console.error)
