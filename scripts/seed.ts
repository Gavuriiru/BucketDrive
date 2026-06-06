import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "@bucketdrive/shared/db/schema"
import { v4 as uuid } from "uuid"
import { existsSync, readdirSync, statSync } from "fs"
import { resolve, join } from "path"
import { createHash, randomBytes } from "crypto"

const FALLBACK_DB_PATH = resolve(__dirname, "../apps/api/.db/local.sqlite")
const WRANGLER_D1_DIR = resolve(__dirname, "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject")

function resolveDbPath() {
  if (existsSync(WRANGLER_D1_DIR)) {
    const candidates = readdirSync(WRANGLER_D1_DIR)
      .filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
      .map((file) => join(WRANGLER_D1_DIR, file))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)

    if (candidates.length > 0) {
      return candidates[0]!
    }
  }

  return FALLBACK_DB_PATH
}

function hashSharePassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = createHash("sha256")
    .update(password + salt)
    .digest("hex")

  return `${salt}:${hash}`
}

function main() {
  console.log("Seeding database...")

  const dbPath = resolveDbPath()
  if (!existsSync(dbPath)) {
    console.error("Database file not found. Run pnpm db:migrate:dev first.")
    process.exit(1)
  }

  console.log(`Using database: ${dbPath}`)
  const sqlite = new Database(dbPath)
  sqlite.pragma("foreign_keys = ON")

  const db = drizzle(sqlite, { schema })
  const now = new Date().toISOString()
  const bucketId = uuid()
  const ownerId = uuid()
  const adminId = uuid()
  const editorId = uuid()
  const viewerId = uuid()

  db.insert(schema.bucket)
    .values({
      id: bucketId,
      name: "BucketDrive",
      provider: "r2",
      visibility: "private",
      createdAt: now,
    })
    .run()

  db.insert(schema.bucketSettings)
    .values({
      id: uuid(),
      bucketId,
      storageQuotaBytes: 10 * 1024 * 1024 * 1024,
      enablePublicSignup: true,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  const users = [
    { id: ownerId, name: "Owner User", email: "owner@bucketdrive.dev", role: "owner" },
    { id: adminId, name: "Admin User", email: "admin@bucketdrive.dev", role: "admin" },
    { id: editorId, name: "Editor User", email: "editor@bucketdrive.dev", role: "editor" },
    { id: viewerId, name: "Viewer User", email: "viewer@bucketdrive.dev", role: "viewer" },
  ]

  for (const seededUser of users) {
    db.insert(schema.user)
      .values({
        id: seededUser.id,
        name: seededUser.name,
        email: seededUser.email,
        emailVerified: true,
        image: null,
        isPlatformAdmin: seededUser.role === "owner",
        role: seededUser.role,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  const rootFolderId = uuid()

  db.insert(schema.folder)
    .values({
      id: rootFolderId,
      parentFolderId: null,
      name: "Documents",
      path: "/Documents",
      createdBy: ownerId,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  const sampleFiles = [
    { name: "welcome.txt", mime: "text/plain", ext: ".txt", size: 1200, folderId: null },
    {
      name: "getting-started.pdf",
      mime: "application/pdf",
      ext: ".pdf",
      size: 560000,
      folderId: null,
    },
    {
      name: "project-proposal.pdf",
      mime: "application/pdf",
      ext: ".pdf",
      size: 245000,
      folderId: rootFolderId,
    },
    {
      name: "budget-2026.xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ext: ".xlsx",
      size: 89000,
      folderId: rootFolderId,
    },
    {
      name: "team-photo.png",
      mime: "image/png",
      ext: ".png",
      size: 3200000,
      folderId: rootFolderId,
    },
  ]

  const fileIds: Array<{ id: string; name: string }> = []

  for (const file of sampleFiles) {
    const fileId = uuid()
    fileIds.push({ id: fileId, name: file.name })

    db.insert(schema.fileObject)
      .values({
        id: fileId,
        bucketId,
        folderId: file.folderId,
        ownerId,
        storageKey: `bucket/files/${uuid()}`,
        originalName: file.name,
        mimeType: file.mime,
        extension: file.ext,
        sizeBytes: file.size,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  const tagColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]
  const tagNames = ["Important", "Draft", "Final", "Archived", "Review"]

  for (let i = 0; i < tagNames.length; i++) {
    db.insert(schema.fileTag)
      .values({
        id: uuid(),
        name: tagNames[i]!,
        color: tagColors[i]!,
        createdAt: now,
      })
      .run()
  }

  const firstFile = fileIds[0]
  if (firstFile) {
    const shareId = uuid()
    db.insert(schema.shareLink)
      .values({
        id: shareId,
        resourceType: "file",
        resourceId: firstFile.id,
        shareType: "internal",
        createdBy: ownerId,
        isActive: true,
        accessCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    for (const permission of ["read", "download"]) {
      db.insert(schema.sharePermission)
        .values({
          id: uuid(),
          shareLinkId: shareId,
          permission,
        })
        .run()
    }

    const externalPassword = "test123"
    const extShareId = uuid()
    db.insert(schema.shareLink)
      .values({
        id: extShareId,
        resourceType: "file",
        resourceId: firstFile.id,
        shareType: "external_direct",
        createdBy: ownerId,
        passwordHash: hashSharePassword(externalPassword),
        isActive: true,
        accessCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    console.log(`  Seed share ID: ${shareId} (shared ${firstFile.name})`)
    console.log(`  External share ID: ${extShareId} (password: ${externalPassword})`)
  }

  const inviteToken = uuid()
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  db.insert(schema.bucketInvitation)
    .values({
      id: uuid(),
      email: "pending@bucketdrive.dev",
      token: inviteToken,
      role: "editor",
      invitedBy: ownerId,
      status: "pending",
      expiresAt: inviteExpiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  console.log(`Seeded bucket: ${bucketId}`)
  console.log(`  Owner ID: ${ownerId}`)
  console.log(`  Admin ID: ${adminId}`)
  console.log(`  Editor ID: ${editorId}`)
  console.log(`  Viewer ID: ${viewerId}`)
  console.log(`  Files: ${sampleFiles.length}`)
  console.log(`  Tags: ${tagNames.length}`)
  console.log(`  Pending invitation: ${inviteToken} (pending@bucketdrive.dev)`)

  sqlite.close()
}

main()
