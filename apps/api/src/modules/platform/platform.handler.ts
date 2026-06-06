import { Hono } from "hono"
import { eq } from "drizzle-orm"
import {
  PlatformJoinResponse,
  PlatformSettingsResponse,
  UpdatePlatformSettingsRequest,
  UpdatePlatformSettingsResponse,
} from "@bucketdrive/shared"
import { platformSettings } from "@bucketdrive/shared/db/schema"
import { getDB } from "../../lib/db"
import { authMiddleware } from "../../middleware/auth"
import { requirePlatformAdmin } from "../../middleware/platform-admin"
import { createStorageProvider } from "../../services/storage"
import { readUploadedBrandingImage, sanitizeAssetName } from "../../lib/branding-assets"

interface PlatformEnv {
  DB: D1Database
  STORAGE: R2Bucket
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ENDPOINT?: string
  R2_BUCKET_NAME?: string
}

interface PlatformVariables {
  user: {
    id: string
    email: string
    name: string
    isPlatformAdmin: boolean
    role: string
  }
}

const platform = new Hono<{ Bindings: PlatformEnv; Variables: PlatformVariables }>()
const PLATFORM_SETTINGS_ID = "default"

platform.get("/me", authMiddleware, (c) => {
  const currentUser = c.get("user")
  return c.json({
    id: currentUser.id,
    email: currentUser.email,
    name: currentUser.name,
    isPlatformAdmin: currentUser.isPlatformAdmin,
    role: currentUser.role,
  })
})

platform.get("/settings", async () => {
  return Response.json(
    PlatformSettingsResponse.parse(toPlatformSettingsResponse(await ensurePlatformSettings())),
  )
})

platform.get("/assets/:kind", async (c) => {
  const kind = parseAssetKind(c.req.param("kind"))
  if (!kind) return c.json({ code: "NOT_FOUND", message: "Asset not found" }, 404)

  const settings = await ensurePlatformSettings()
  const key = kind === "logo" ? settings.logoKey : settings.faviconKey
  if (!key) return c.json({ code: "NOT_FOUND", message: "Asset not found" }, 404)

  const object = await createStorageProvider(c.env).getObject(key)
  if (!object) return c.json({ code: "NOT_FOUND", message: "Asset not found" }, 404)

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType ?? "application/octet-stream",
      "Content-Length": String(object.size),
      "Cache-Control": "public, max-age=300",
    },
  })
})

platform.patch("/settings", authMiddleware, requirePlatformAdmin, async (c) => {
  const body = UpdatePlatformSettingsRequest.parse(await c.req.json())
  const settings = await ensurePlatformSettings()
  const now = new Date().toISOString()
  await getDB()
    .update(platformSettings)
    .set({
      platformName: body.platformName ?? settings.platformName,
      enablePublicSignup: body.enablePublicSignup ?? settings.enablePublicSignup,
      updatedAt: now,
    })
    .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
    .run()

  return c.json(
    UpdatePlatformSettingsResponse.parse({
      success: true,
      settings: toPlatformSettingsResponse(await ensurePlatformSettings()),
    }),
  )
})

platform.post("/assets/:kind", authMiddleware, requirePlatformAdmin, async (c) => {
  const kind = parseAssetKind(c.req.param("kind"))
  if (!kind) return c.json({ code: "NOT_FOUND", message: "Asset not found" }, 404)

  const file = await readUploadedBrandingImage(c.req.raw)
  if ("error" in file) return c.json(file.error, file.status as never)

  const key = `branding/platform/${kind}-${crypto.randomUUID()}-${sanitizeAssetName(file.name)}`
  await createStorageProvider(c.env).upload({
    key,
    body: await file.arrayBuffer(),
    contentType: file.type,
  })

  const now = new Date().toISOString()
  await ensurePlatformSettings()
  await getDB()
    .update(platformSettings)
    .set({
      [kind === "logo" ? "logoKey" : "faviconKey"]: key,
      updatedAt: now,
    })
    .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
    .run()

  return c.json({
    success: true,
    settings: PlatformSettingsResponse.parse(
      toPlatformSettingsResponse(await ensurePlatformSettings()),
    ),
  })
})

platform.post("/join", authMiddleware, async (c) => {
  const settings = await ensurePlatformSettings()
  if (!settings.enablePublicSignup) {
    return c.json({ code: "FORBIDDEN", message: "Public signup is disabled" }, 403)
  }
  return c.json(PlatformJoinResponse.parse({ success: true, role: c.get("user").role }))
})

async function ensurePlatformSettings() {
  const db = getDB()
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
    .get()
  if (existing) return existing

  const now = new Date().toISOString()
  const created = {
    id: PLATFORM_SETTINGS_ID,
    platformName: "BucketDrive",
    enablePublicSignup: true,
    logoKey: null,
    faviconKey: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(platformSettings).values(created).run()
  return created
}

function toPlatformSettingsResponse(settings: Awaited<ReturnType<typeof ensurePlatformSettings>>) {
  return {
    platformName: settings.platformName,
    enablePublicSignup: settings.enablePublicSignup,
    platformLogoUrl: settings.logoKey ? `/api/platform/assets/logo?v=${settings.updatedAt}` : null,
    faviconUrl: settings.faviconKey ? `/api/platform/assets/favicon?v=${settings.updatedAt}` : null,
  }
}

function parseAssetKind(value: string | undefined): "logo" | "favicon" | null {
  return value === "logo" || value === "favicon" ? value : null
}

export const platformHandler = platform
