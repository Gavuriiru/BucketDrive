import { Hono } from "hono"
import { getDB } from "../../lib/db"
import { ensureBucketSettings, getOrCreateDefaultBucket } from "../../lib/bucket"
import { authMiddleware } from "../../middleware/auth"

interface WorkspacesVariables {
  user: {
    id: string
    role: string
  }
}

const workspaces = new Hono<{ Variables: WorkspacesVariables }>()

workspaces.use("*", authMiddleware)

workspaces.get("/", async (c) => {
  const db = getDB()
  const currentUser = c.get("user")
  const defaultBucket = await getOrCreateDefaultBucket(db)
  const settings = await ensureBucketSettings(db)
  const createdAt = defaultBucket.createdAt

  return c.json({
    data: [
      {
        id: defaultBucket.id,
        name: defaultBucket.name,
        slug: "bucket",
        ownerId: currentUser.id,
        role: currentUser.role,
        storageQuotaBytes: settings.storageQuotaBytes,
        createdAt,
        updatedAt: settings.updatedAt,
      },
    ],
  })
})

export const workspacesHandler = workspaces
