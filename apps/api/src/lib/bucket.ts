import { eq } from "drizzle-orm"
import { bucket, bucketSettings } from "@bucketdrive/shared/db/schema"
import type { getDB } from "./db"

type DB = ReturnType<typeof getDB>

export async function getOrCreateDefaultBucket(db: DB) {
  const existing = await db.select().from(bucket).get()
  if (existing) return existing

  const now = new Date().toISOString()
  const created = {
    id: crypto.randomUUID(),
    name: "BucketDrive",
    provider: "r2",
    region: null,
    visibility: "private",
    createdAt: now,
  }

  await db.insert(bucket).values(created).run()
  return created
}

export async function ensureBucketSettings(db: DB) {
  const defaultBucket = await getOrCreateDefaultBucket(db)
  const existing = await db
    .select()
    .from(bucketSettings)
    .where(eq(bucketSettings.bucketId, defaultBucket.id))
    .get()

  if (existing) return existing

  const now = new Date().toISOString()
  const created = {
    id: crypto.randomUUID(),
    bucketId: defaultBucket.id,
    storageQuotaBytes: 10 * 1024 * 1024 * 1024,
    defaultShareExpirationDays: 30,
    enablePublicSignup: false,
    trashRetentionDays: 30,
    maxFileSizeBytes: 5 * 1024 * 1024 * 1024,
    uploadChunkSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: JSON.stringify([]),
    brandingLogoUrl: null,
    brandingLogoKey: null,
    brandingName: null,
    r2PublicBaseUrl: null,
    r2LastSyncAt: null,
    r2SyncStatus: "idle",
    r2SyncError: null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(bucketSettings).values(created).run()
  return created
}
