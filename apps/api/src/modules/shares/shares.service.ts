import { and, eq, inArray, ne, sql, type SQL } from "drizzle-orm"
import {
  auditLog,
  bucketSettings,
  fileObject,
  folder,
  platformSettings,
  shareAccessAttempt,
  shareLink,
  sharePermission,
  user,
} from "@bucketdrive/shared/db/schema"
import { getDB } from "../../lib/db"
import { buildPublicObjectUrl, type StorageProvider } from "../../services/storage"
import { can, ShareLinkSchema } from "@bucketdrive/shared"
import type {
  ShareDashboardItem,
  ShareLink,
  SharesListScope,
  WorkspaceRole,
} from "@bucketdrive/shared"

const encoder = new TextEncoder()
const SHARE_PASSWORD_ITERATIONS = 120_000

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ])
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: SHARE_PASSWORD_ITERATIONS },
    key,
    256,
  )
  return `pbkdf2:${String(SHARE_PASSWORD_ITERATIONS)}:${toHex(salt)}:${toHex(new Uint8Array(hashBuffer))}`
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":")
  if (parts[0] === "pbkdf2") {
    const [, iterationsRaw, saltHex, hashHex] = parts
    const iterations = Number(iterationsRaw)
    if (!iterations || !saltHex || !hashHex) return false
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
      "deriveBits",
    ])
    const hashBuffer = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(fromHex(saltHex)), iterations },
      key,
      256,
    )
    return toHex(new Uint8Array(hashBuffer)) === hashHex
  }
  return false
}

export interface CreateShareParams {
  userId: string
  resourceType: "file" | "folder"
  resourceId: string
  shareType: "internal" | "external_direct" | "external_explorer"
  password?: string
  expiresAt?: string
  permissions?: ("read" | "download")[]
}

export interface ListSharesParams {
  userId: string
  role: WorkspaceRole
  page: number
  limit: number
  q?: string
  scope: SharesListScope
}

export interface UpdateShareParams {
  shareId: string
  userId: string
  role: WorkspaceRole
  password?: string | null
  expiresAt?: string | null
  isActive?: boolean
}

export interface RevokeShareParams {
  shareId: string
  userId: string
  role: WorkspaceRole
}

export class SharesService {
  async createShare(params: CreateShareParams): Promise<ShareLink> {
    const db = getDB()
    const resource = await this.findResource(params.resourceType, params.resourceId)
    if (!resource) throw new ShareError("NOT_FOUND", `${params.resourceType} not found`)
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    await db
      .insert(shareLink)
      .values({
        id,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        shareType: params.shareType,
        createdBy: params.userId,
        passwordHash: params.password ? await hashPassword(params.password) : null,
        expiresAt: params.expiresAt ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    if (params.permissions && params.permissions.length > 0) {
      await db
        .insert(sharePermission)
        .values(
          params.permissions.map((permission) => ({
            id: crypto.randomUUID(),
            shareLinkId: id,
            permission,
          })),
        )
        .run()
    }
    await this.recordAudit({
      actorId: params.userId,
      action: "share.created",
      resourceId: id,
      metadata: {
        shareType: params.shareType,
        resourceType: params.resourceType,
        sharedResourceId: params.resourceId,
      },
    })
    const created = await db.select().from(shareLink).where(eq(shareLink.id, id)).get()
    if (!created) throw new ShareError("INTERNAL_ERROR", "Failed to create share")
    return ShareLinkSchema.parse(created)
  }

  async listShares(params: ListSharesParams) {
    const db = getDB()
    const canManageAll = can(params.role, "shares.manage_all")
    const effectiveScope = params.scope === "bucket" && !canManageAll ? "mine" : params.scope
    const conditions: SQL[] = []
    if (effectiveScope === "shared_with_me") {
      conditions.push(
        eq(shareLink.shareType, "internal"),
        ne(shareLink.createdBy, params.userId),
        eq(shareLink.isActive, true),
      )
    } else if (effectiveScope === "mine" || !canManageAll) {
      conditions.push(eq(shareLink.createdBy, params.userId))
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const rows = await db
      .select()
      .from(shareLink)
      .where(whereClause)
      .orderBy(sql`${shareLink.createdAt} desc`)
      .all()
    const shareIds = rows.map((row) => row.id)
    const creatorIds = Array.from(new Set(rows.map((row) => row.createdBy)))
    const fileIds = rows.filter((row) => row.resourceType === "file").map((row) => row.resourceId)
    const folderIds = rows
      .filter((row) => row.resourceType === "folder")
      .map((row) => row.resourceId)
    const [permissionRows, creatorRows, fileRows, folderRows] = await Promise.all([
      shareIds.length > 0
        ? db
            .select({
              shareLinkId: sharePermission.shareLinkId,
              permission: sharePermission.permission,
            })
            .from(sharePermission)
            .where(inArray(sharePermission.shareLinkId, shareIds))
            .all()
        : [],
      creatorIds.length > 0
        ? db
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, creatorIds))
            .all()
        : [],
      fileIds.length > 0
        ? db
            .select({ id: fileObject.id, name: fileObject.originalName })
            .from(fileObject)
            .where(inArray(fileObject.id, fileIds))
            .all()
        : [],
      folderIds.length > 0
        ? db
            .select({ id: folder.id, name: folder.name })
            .from(folder)
            .where(inArray(folder.id, folderIds))
            .all()
        : [],
    ])
    const creatorNameById = new Map(creatorRows.map((row) => [row.id, row.name]))
    const resourceNameById = new Map([
      ...fileRows.map((row) => [row.id, row.name] as const),
      ...folderRows.map((row) => [row.id, row.name] as const),
    ])
    const permissionsByShareId = new Map<string, Array<"read" | "download">>()
    for (const row of permissionRows) {
      const current = permissionsByShareId.get(row.shareLinkId) ?? []
      permissionsByShareId.set(row.shareLinkId, [...current, row.permission as "read" | "download"])
    }
    const mapped: ShareDashboardItem[] = rows.map((row) => ({
      ...ShareLinkSchema.parse(row),
      resourceName: resourceNameById.get(row.resourceId) ?? "Deleted resource",
      createdByName: creatorNameById.get(row.createdBy) ?? "Unknown user",
      permissions: permissionsByShareId.get(row.id) ?? [],
      hasPassword: row.passwordHash !== null,
      isLocked: false,
    }))
    const q = params.q?.trim().toLowerCase()
    const filtered = q
      ? mapped.filter(
          (share) =>
            share.resourceName.toLowerCase().includes(q) ||
            share.createdByName.toLowerCase().includes(q),
        )
      : mapped
    const start = (params.page - 1) * params.limit
    const data = filtered.slice(start, start + params.limit)
    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / params.limit),
        scope: effectiveScope,
        currentUserRole: params.role,
        canManageAll,
      },
    }
  }

  async updateShare(params: UpdateShareParams): Promise<ShareLink> {
    const db = getDB()
    const existing = await db.select().from(shareLink).where(eq(shareLink.id, params.shareId)).get()
    if (!existing) throw new ShareError("SHARE_NOT_FOUND", "Share not found")
    if (!this.canManageShare(params.role, existing.createdBy, params.userId))
      throw new ShareError("FORBIDDEN", "Cannot update this share")
    const updateSet: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (params.password !== undefined)
      updateSet.passwordHash = params.password === null ? null : await hashPassword(params.password)
    if (params.expiresAt !== undefined) updateSet.expiresAt = params.expiresAt
    if (params.isActive !== undefined) updateSet.isActive = params.isActive
    await db.update(shareLink).set(updateSet).where(eq(shareLink.id, params.shareId)).run()
    await this.recordAudit({
      actorId: params.userId,
      action: "share.updated",
      resourceId: params.shareId,
      metadata: updateSet,
    })
    const updated = await db.select().from(shareLink).where(eq(shareLink.id, params.shareId)).get()
    if (!updated) throw new ShareError("SHARE_NOT_FOUND", "Share not found after update")
    return ShareLinkSchema.parse(updated)
  }

  async revokeShare(params: RevokeShareParams): Promise<void> {
    const db = getDB()
    const existing = await db.select().from(shareLink).where(eq(shareLink.id, params.shareId)).get()
    if (!existing) throw new ShareError("SHARE_NOT_FOUND", "Share not found")
    if (!this.canManageShare(params.role, existing.createdBy, params.userId))
      throw new ShareError("FORBIDDEN", "Cannot revoke this share")
    await db
      .update(shareLink)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(shareLink.id, params.shareId))
      .run()
    await this.recordAudit({
      actorId: params.userId,
      action: "share.revoked",
      resourceId: params.shareId,
    })
  }

  async getShareInfo(shareId: string) {
    const share = await this.getShareOrThrow(shareId)
    const resourceName = await this.getResourceName(
      share.resourceType as "file" | "folder",
      share.resourceId,
    )
    return {
      id: share.id,
      resourceType: share.resourceType as "file" | "folder",
      resourceName,
      shareType: share.shareType as ShareLink["shareType"],
      hasPassword: share.passwordHash !== null,
      isActive: share.isActive,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      ...(await this.getBucketBranding()),
    }
  }

  async accessShare(
    shareId: string,
    storage: StorageProvider,
    options?: { password?: string; ipAddress?: string; userAgent?: string; downloadOnly?: boolean },
  ) {
    const db = getDB()
    const share = await this.getShareOrThrow(shareId)
    await this.assertShareAccessible(share, options)
    const branding = await this.getBucketBranding()
    if (share.resourceType === "file") {
      const file = await db
        .select()
        .from(fileObject)
        .where(and(eq(fileObject.id, share.resourceId), eq(fileObject.isDeleted, false)))
        .get()
      if (!file) throw new ShareError("NOT_FOUND", "Shared file not found")
      const signedUrl = await storage.generateSignedDownloadUrl(file.storageKey, 900, {
        filename: file.originalName,
      })
      const settings = await db
        .select({ r2PublicBaseUrl: bucketSettings.r2PublicBaseUrl })
        .from(bucketSettings)
        .get()
      await this.markAccess(share.id, options, true, options?.downloadOnly)
      return {
        resourceType: "file" as const,
        resourceName: file.originalName,
        signedUrl,
        publicUrl:
          buildPublicObjectUrl(settings?.r2PublicBaseUrl ?? null, file.storageKey) ?? undefined,
        ...branding,
      }
    }
    const root = await db
      .select()
      .from(folder)
      .where(and(eq(folder.id, share.resourceId), eq(folder.isDeleted, false)))
      .get()
    if (!root) throw new ShareError("NOT_FOUND", "Shared folder not found")
    const [files, folders] = await Promise.all([
      db
        .select()
        .from(fileObject)
        .where(and(eq(fileObject.folderId, root.id), eq(fileObject.isDeleted, false)))
        .all(),
      db
        .select()
        .from(folder)
        .where(and(eq(folder.parentFolderId, root.id), eq(folder.isDeleted, false)))
        .all(),
    ])
    await this.markAccess(share.id, options, true, false)
    return {
      resourceType: "folder" as const,
      resourceName: root.name,
      files: files.map((file) => ({
        id: file.id,
        name: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      })),
      folders: folders.map((entry) => ({ id: entry.id, name: entry.name })),
      ...branding,
    }
  }

  async browseShare(
    shareId: string,
    folderId: string | null,
    options?: { password?: string; ipAddress?: string; userAgent?: string },
  ) {
    const db = getDB()
    const share = await this.getShareOrThrow(shareId)
    await this.assertShareAccessible(share, options)
    if (share.resourceType !== "folder")
      throw new ShareError("INVALID_RESOURCE", "Only folder shares can be browsed")
    const root = await db
      .select()
      .from(folder)
      .where(and(eq(folder.id, share.resourceId), eq(folder.isDeleted, false)))
      .get()
    if (!root) throw new ShareError("NOT_FOUND", "Shared folder not found")
    const currentFolderId = folderId ?? root.id
    const current = await db.select().from(folder).where(eq(folder.id, currentFolderId)).get()
    if (!current || !this.isWithinFolder(root, current))
      throw new ShareError("NOT_FOUND", "Folder not found")
    const [files, folders] = await Promise.all([
      db
        .select()
        .from(fileObject)
        .where(and(eq(fileObject.folderId, current.id), eq(fileObject.isDeleted, false)))
        .all(),
      db
        .select()
        .from(folder)
        .where(and(eq(folder.parentFolderId, current.id), eq(folder.isDeleted, false)))
        .all(),
    ])
    return {
      resourceName: root.name,
      currentFolderId: current.id,
      breadcrumbs: [
        { id: root.id, name: root.name },
        ...(current.id === root.id ? [] : [{ id: current.id, name: current.name }]),
      ],
      files: files.map((file) => ({
        id: file.id,
        name: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      })),
      folders: folders.map((entry) => ({ id: entry.id, name: entry.name })),
      ...(await this.getBucketBranding()),
    }
  }

  async previewSharedFolderFile(
    shareId: string,
    fileId: string,
    storage: StorageProvider,
    options?: { password?: string; ipAddress?: string; userAgent?: string },
  ) {
    const { file } = await this.getSharedFolderFileOrThrow(shareId, fileId, options)
    const signedUrl = await storage.generateSignedDownloadUrl(file.storageKey, 300)
    return {
      signedUrl,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      fileName: file.originalName,
      mimeType: file.mimeType,
    }
  }

  async downloadSharedFolderFile(
    shareId: string,
    fileId: string,
    storage: StorageProvider,
    options?: { password?: string; ipAddress?: string; userAgent?: string },
  ) {
    const db = getDB()
    const { share, file } = await this.getSharedFolderFileOrThrow(shareId, fileId, options)
    const signedUrl = await storage.generateSignedDownloadUrl(file.storageKey, 900, {
      filename: file.originalName,
    })
    const settings = await db
      .select({ r2PublicBaseUrl: bucketSettings.r2PublicBaseUrl })
      .from(bucketSettings)
      .get()
    await this.markAccess(share.id, options, true, true)
    return {
      signedUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      fileName: file.originalName,
      publicUrl:
        buildPublicObjectUrl(settings?.r2PublicBaseUrl ?? null, file.storageKey) ?? undefined,
    }
  }

  private async assertShareAccessible(
    share: typeof shareLink.$inferSelect,
    options?: { password?: string; ipAddress?: string; userAgent?: string },
  ) {
    if (!share.isActive) throw new ShareError("SHARE_REVOKED", "Share has been revoked")
    if (share.expiresAt && share.expiresAt < new Date().toISOString())
      throw new ShareError("SHARE_EXPIRED", "Share has expired")
    if (share.passwordHash) {
      if (!options?.password) {
        await this.markAccess(share.id, options, false, false)
        throw new ShareError("PASSWORD_REQUIRED", "Password required")
      }
      if (!(await verifyPassword(options.password, share.passwordHash))) {
        await this.markAccess(share.id, options, false, false)
        throw new ShareError("INVALID_PASSWORD", "Invalid password")
      }
    }
  }

  private async markAccess(
    shareId: string,
    options: { ipAddress?: string; userAgent?: string } | undefined,
    success: boolean,
    downloadOnly?: boolean,
  ) {
    const db = getDB()
    await db
      .insert(shareAccessAttempt)
      .values({
        id: crypto.randomUUID(),
        shareLinkId: shareId,
        ipAddress: options?.ipAddress ?? "unknown",
        userAgent: options?.userAgent ?? null,
        success,
        attemptedAt: new Date().toISOString(),
      })
      .run()
    if (success) {
      await db
        .update(shareLink)
        .set({
          accessCount: sql`${shareLink.accessCount} + 1`,
          downloadCount: downloadOnly ? sql`${shareLink.downloadCount} + 1` : undefined,
          lastAccessedAt: new Date().toISOString(),
        })
        .where(eq(shareLink.id, shareId))
        .run()
    }
  }

  private async getShareOrThrow(shareId: string) {
    const share = await getDB().select().from(shareLink).where(eq(shareLink.id, shareId)).get()
    if (!share) throw new ShareError("SHARE_NOT_FOUND", "Share link not found")
    return share
  }

  private async getSharedFolderFileOrThrow(
    shareId: string,
    fileId: string,
    options?: { password?: string; ipAddress?: string; userAgent?: string },
  ) {
    const db = getDB()
    const share = await this.getShareOrThrow(shareId)
    await this.assertShareAccessible(share, options)
    if (share.resourceType !== "folder")
      throw new ShareError("INVALID_RESOURCE", "Only folder shares expose file actions")

    const [root, file] = await Promise.all([
      db
        .select()
        .from(folder)
        .where(and(eq(folder.id, share.resourceId), eq(folder.isDeleted, false)))
        .get(),
      db
        .select()
        .from(fileObject)
        .where(and(eq(fileObject.id, fileId), eq(fileObject.isDeleted, false)))
        .get(),
    ])
    if (!root || !file) throw new ShareError("NOT_FOUND", "Shared file not found")
    if (file.folderId === root.id) return { share, root, file }
    if (!file.folderId) throw new ShareError("NOT_FOUND", "Shared file not found")

    const fileFolder = await db.select().from(folder).where(eq(folder.id, file.folderId)).get()
    if (!fileFolder || fileFolder.isDeleted || !this.isWithinFolder(root, fileFolder)) {
      throw new ShareError("NOT_FOUND", "Shared file not found")
    }

    return { share, root, file }
  }

  private async findResource(resourceType: "file" | "folder", resourceId: string) {
    const db = getDB()
    if (resourceType === "file")
      return db
        .select()
        .from(fileObject)
        .where(and(eq(fileObject.id, resourceId), eq(fileObject.isDeleted, false)))
        .get()
    return db
      .select()
      .from(folder)
      .where(and(eq(folder.id, resourceId), eq(folder.isDeleted, false)))
      .get()
  }

  private async getResourceName(resourceType: "file" | "folder", resourceId: string) {
    const resource = await this.findResource(resourceType, resourceId)
    if (!resource) return resourceType === "file" ? "Unknown file" : "Unknown folder"
    return "originalName" in resource ? resource.originalName : resource.name
  }

  private canManageShare(role: WorkspaceRole, createdBy: string, userId: string): boolean {
    return createdBy === userId || can(role, "shares.manage_all")
  }

  private async getBucketBranding(): Promise<{
    brandingLogoUrl: string | null
    brandingName: string | null
  }> {
    const settings = await getDB()
      .select({
        brandingLogoUrl: bucketSettings.brandingLogoUrl,
        brandingLogoKey: bucketSettings.brandingLogoKey,
        brandingName: bucketSettings.brandingName,
      })
      .from(bucketSettings)
      .get()
    const platform = await getDB()
      .select({
        platformName: platformSettings.platformName,
        logoKey: platformSettings.logoKey,
        updatedAt: platformSettings.updatedAt,
      })
      .from(platformSettings)
      .get()
    return {
      brandingLogoUrl: settings?.brandingLogoKey
        ? "/api/shares/assets/branding-logo"
        : (settings?.brandingLogoUrl ??
          (platform?.logoKey ? `/api/platform/assets/logo?v=${platform.updatedAt}` : null)),
      brandingName: settings?.brandingName ?? platform?.platformName ?? null,
    }
  }

  private isWithinFolder(root: typeof folder.$inferSelect, current: typeof folder.$inferSelect) {
    return current.id === root.id || current.path.startsWith(`${root.path}/`)
  }

  private async recordAudit(params: {
    actorId: string
    action: string
    resourceId: string
    metadata?: Record<string, unknown>
  }) {
    await getDB()
      .insert(auditLog)
      .values({
        id: crypto.randomUUID(),
        actorId: params.actorId,
        action: params.action,
        resourceType: "share",
        resourceId: params.resourceId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        createdAt: new Date().toISOString(),
      })
      .run()
  }
}

export class ShareError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = "ShareError"
  }
}
