import { eq } from "drizzle-orm"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import type { Context } from "hono"
import { fileObject, user as userSchema } from "@bucketdrive/shared/db/schema"
import { getDB } from "./db"
import { getOrCreateDefaultBucket } from "./bucket"

const E2E_COOKIE = "__bucketdrive_e2e_user"

interface E2EAuthEnv {
  E2E_TEST_AUTH?: string
}

interface E2EUser {
  id: string
  email: string
  name: string
  image?: string | null
  isPlatformAdmin: boolean
  role: string
}

export function isE2EAuthEnabled(env: E2EAuthEnv): boolean {
  return env.E2E_TEST_AUTH === "true"
}

export async function getE2ESession(c: Context): Promise<{
  user: E2EUser
  session: { id: string; userId: string; expiresAt: Date }
} | null> {
  if (!isE2EAuthEnabled(c.env as E2EAuthEnv)) return null

  const userId = getCookie(c, E2E_COOKIE)
  if (!userId) return null

  const db = getDB()
  const dbUser = await db
    .select({
      id: userSchema.id,
      email: userSchema.email,
      name: userSchema.name,
      image: userSchema.image,
      isPlatformAdmin: userSchema.isPlatformAdmin,
      role: userSchema.role,
    })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .get()

  if (!dbUser) return null

  return {
    user: dbUser,
    session: {
      id: `e2e-session-${dbUser.id}`,
      userId: dbUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  }
}

export async function e2eLogin(c: Context): Promise<Response> {
  if (!isE2EAuthEnabled(c.env as E2EAuthEnv)) {
    return c.json({ code: "NOT_FOUND", message: "Not found" }, 404)
  }

  const body = (await c.req.json().catch(() => ({}))) as { email?: unknown }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  if (!email) {
    return c.json({ code: "VALIDATION_ERROR", message: "email is required" }, 400)
  }

  const db = getDB()
  const dbUser = await db
    .select({
      id: userSchema.id,
      email: userSchema.email,
      name: userSchema.name,
      image: userSchema.image,
      isPlatformAdmin: userSchema.isPlatformAdmin,
      role: userSchema.role,
    })
    .from(userSchema)
    .where(eq(userSchema.email, email))
    .get()

  if (!dbUser) {
    return c.json({ code: "NOT_FOUND", message: "E2E user not found" }, 404)
  }

  setCookie(c, E2E_COOKIE, dbUser.id, {
    httpOnly: true,
    sameSite: "Lax",
    secure: false,
    path: "/",
    maxAge: 24 * 60 * 60,
  })

  return c.json({
    user: dbUser,
    session: {
      id: `e2e-session-${dbUser.id}`,
      userId: dbUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  })
}

export async function e2eGetSession(c: Context): Promise<Response | null> {
  const session = await getE2ESession(c)
  if (!session) return null

  return c.json({
    user: session.user,
    session: {
      ...session.session,
      expiresAt: session.session.expiresAt.toISOString(),
    },
  })
}

export function e2eSignOut(c: Context): Response | null {
  if (!isE2EAuthEnabled(c.env as E2EAuthEnv)) return null

  deleteCookie(c, E2E_COOKIE, {
    path: "/",
  })

  return c.json({ success: true })
}

export async function e2eCreateFile(c: Context): Promise<Response> {
  const session = await getE2ESession(c)
  if (!session) {
    return c.json({ code: "UNAUTHORIZED", message: "Authentication required" }, 401)
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    name?: unknown
    mimeType?: unknown
    sizeBytes?: unknown
    folderId?: unknown
    deleted?: unknown
  }

  const name = typeof body.name === "string" ? body.name : ""
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "text/plain"
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 1024
  const folderId = typeof body.folderId === "string" ? body.folderId : null
  const deleted = body.deleted === true

  if (!name) {
    return c.json({ code: "VALIDATION_ERROR", message: "name is required" }, 400)
  }

  const db = getDB()
  const defaultBucket = await getOrCreateDefaultBucket(db)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const extension = name.includes(".") ? (name.split(".").pop()?.toLowerCase() ?? null) : null

  await db
    .insert(fileObject)
    .values({
      id,
      bucketId: defaultBucket.id,
      folderId,
      ownerId: session.user.id,
      storageKey: `bucket/files/e2e/${id}/${name}`,
      originalName: name,
      mimeType,
      extension,
      sizeBytes,
      isDeleted: deleted,
      deletedAt: deleted ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  const created = await db.select().from(fileObject).where(eq(fileObject.id, id)).get()
  return c.json(created, 201)
}

export async function e2eCreateFilesBulk(c: Context): Promise<Response> {
  const session = await getE2ESession(c)
  if (!session) {
    return c.json({ code: "UNAUTHORIZED", message: "Authentication required" }, 401)
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    count?: unknown
    prefix?: unknown
    mimeType?: unknown
    sizeBytes?: unknown
  }

  const count = typeof body.count === "number" ? Math.floor(body.count) : 0
  const prefix =
    typeof body.prefix === "string" && body.prefix.trim() ? body.prefix.trim() : "benchmark"
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "text/plain"
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 1024

  if (count < 1 || count > 10_000) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: "count between 1 and 10000 is required",
      },
      400,
    )
  }

  const db = getDB()
  const defaultBucket = await getOrCreateDefaultBucket(db)

  const now = new Date().toISOString()
  const batchSize = 5
  let inserted = 0

  while (inserted < count) {
    const batchCount = Math.min(batchSize, count - inserted)
    const rows = Array.from({ length: batchCount }, (_, index) => {
      const sequence = inserted + index + 1
      const id = crypto.randomUUID()
      const name = `${prefix}-${String(sequence).padStart(5, "0")}.txt`

      return {
        id,
        bucketId: defaultBucket.id,
        folderId: null,
        ownerId: session.user.id,
        storageKey: `bucket/files/e2e/${id}/${name}`,
        originalName: name,
        mimeType,
        extension: "txt",
        sizeBytes,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }
    })

    await db.insert(fileObject).values(rows).run()
    inserted += batchCount
  }

  return c.json({ inserted }, 201)
}
