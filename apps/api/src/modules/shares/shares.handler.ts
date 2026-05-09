import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { getDB } from "../../lib/db"
import { createStorageProvider } from "../../services/storage"
import { workspaceMember } from "@bucketdrive/shared/db/schema"
import {
  CreateShareRequest,
  ListSharesResponse,
  UpdateShareRequest,
  ShareAccessRequest,
  ShareAccessResponse,
  ShareInfoResponse,
  ShareBrowseResponse,
} from "@bucketdrive/shared"
import { SharesService, ShareError } from "./shares.service"

interface SharesEnv {
  STORAGE: R2Bucket
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ENDPOINT?: string
  DB: D1Database
}

interface SharesVariables {
  user: { id: string; email: string; name: string }
}

const shares = new Hono<{ Bindings: SharesEnv; Variables: SharesVariables }>()

shares.use("*", authMiddleware)

shares.get("/", requirePermission("shares.read"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400 as never)
  }

  const user = c.get("user")
  const db = getDB()

  const member = await db
    .select({ role: workspaceMember.role })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, user.id),
      ),
    )
    .get()

  const role = member?.role ?? "viewer"
  const sharedWithMe = c.req.query("sharedWithMe") === "true"
  const page = parseInt(c.req.query("page") ?? "1", 10)
  const limit = parseInt(c.req.query("limit") ?? "50", 10)

  const service = new SharesService()
  const result = await service.listShares({
    workspaceId,
    userId: user.id,
    role,
    page,
    limit,
    sharedWithMe,
  })

  return c.json(
    ListSharesResponse.parse({
      data: result.data,
      meta: result.meta,
    }),
  )
})

shares.post("/", requirePermission("shares.create"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  if (!workspaceId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId is required" }, 400 as never)
  }

  const user = c.get("user")
  const body = CreateShareRequest.parse(await c.req.json())

  const service = new SharesService()
  try {
    const result = await service.createShare({
      workspaceId,
      userId: user.id,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      shareType: body.shareType,
      password: body.password,
      expiresAt: body.expiresAt,
      permissions: body.permissions,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof ShareError) {
      return c.json({ code: err.code, message: err.message }, 400 as never)
    }
    throw err
  }
})

shares.patch("/:shareId", requirePermission("shares.update"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const shareId = c.req.param("shareId")
  if (!workspaceId || !shareId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId and shareId are required" }, 400 as never)
  }

  const user = c.get("user")
  const body = UpdateShareRequest.parse(await c.req.json())

  const service = new SharesService()
  try {
    const result = await service.updateShare({
      shareId,
      workspaceId,
      userId: user.id,
      password: body.password,
      expiresAt: body.expiresAt,
      isActive: body.isActive,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof ShareError) {
      const statusMap: Record<string, number> = {
        SHARE_NOT_FOUND: 404,
      }
      return c.json({ code: err.code, message: err.message }, statusMap[err.code] as never ?? 400)
    }
    throw err
  }
})

shares.delete("/:shareId", requirePermission("shares.revoke"), async (c) => {
  const workspaceId = c.req.param("workspaceId")
  const shareId = c.req.param("shareId")
  if (!workspaceId || !shareId) {
    return c.json({ code: "VALIDATION_ERROR", message: "workspaceId and shareId are required" }, 400 as never)
  }

  const user = c.get("user")

  const service = new SharesService()
  try {
    await service.revokeShare(shareId, workspaceId, user.id)
    return c.json({ success: true, shareId })
  } catch (err) {
    if (err instanceof ShareError) {
      return c.json({ code: err.code, message: err.message }, 404 as never)
    }
    throw err
  }
})

const publicShares = new Hono<{ Bindings: SharesEnv }>()

publicShares.get("/:shareId", async (c) => {
  const shareId = c.req.param("shareId")
  if (!shareId) {
    return c.json({ code: "VALIDATION_ERROR", message: "shareId is required" }, 400 as never)
  }

  const service = new SharesService()
  try {
    const result = await service.getShareInfo(shareId)
    return c.json(ShareInfoResponse.parse(result))
  } catch (err) {
    if (err instanceof ShareError) {
      const statusMap: Record<string, number> = {
        SHARE_NOT_FOUND: 404,
      }
      return c.json({ code: err.code, message: err.message }, statusMap[err.code] as never ?? 400)
    }
    throw err
  }
})

publicShares.post("/:shareId/access", async (c) => {
  const shareId = c.req.param("shareId")
  if (!shareId) {
    return c.json({ code: "VALIDATION_ERROR", message: "shareId is required" }, 400 as never)
  }

  const body = ShareAccessRequest.parse(await c.req.json())
  const storage = createStorageProvider(c.env)
  const ipAddress = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown"
  const userAgent = c.req.header("User-Agent") ?? undefined

  const service = new SharesService()
  try {
    const result = await service.accessShare(shareId, storage, {
      password: body.password,
      ipAddress,
      userAgent,
    })
    return c.json(ShareAccessResponse.parse(result))
  } catch (err) {
    if (err instanceof ShareError) {
      const statusMap: Record<string, number> = {
        SHARE_NOT_FOUND: 404,
        SHARE_REVOKED: 410,
        SHARE_EXPIRED: 410,
        PASSWORD_REQUIRED: 401,
        INVALID_PASSWORD: 403,
        SHARE_LOCKED: 423,
        SHARE_PASSWORD_RATE_LIMITED: 429,
        NOT_FOUND: 404,
      }
      return c.json({ code: err.code, message: err.message }, statusMap[err.code] as never ?? 400)
    }
    throw err
  }
})

publicShares.get("/:shareId/browse", async (c) => {
  const shareId = c.req.param("shareId")
  if (!shareId) {
    return c.json({ code: "VALIDATION_ERROR", message: "shareId is required" }, 400 as never)
  }

  const folderId = c.req.query("folderId") ?? null
  const password = c.req.query("password") ?? undefined
  const ipAddress = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown"
  const userAgent = c.req.header("User-Agent") ?? undefined

  const service = new SharesService()
  try {
    const result = await service.browseShare(shareId, folderId, {
      password,
      ipAddress,
      userAgent,
    })
    return c.json(ShareBrowseResponse.parse(result))
  } catch (err) {
    if (err instanceof ShareError) {
      const statusMap: Record<string, number> = {
        SHARE_NOT_FOUND: 404,
        SHARE_REVOKED: 410,
        SHARE_EXPIRED: 410,
        PASSWORD_REQUIRED: 401,
        INVALID_PASSWORD: 403,
        SHARE_LOCKED: 423,
        SHARE_PASSWORD_RATE_LIMITED: 429,
        NOT_FOUND: 404,
        INVALID_RESOURCE: 400,
      }
      return c.json({ code: err.code, message: err.message }, statusMap[err.code] as never ?? 400)
    }
    throw err
  }
})

export const sharesHandler = shares
export const publicSharesHandler = publicShares
