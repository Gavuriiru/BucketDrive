import {
  and,
  eq,
  inArray,
  isNull,
  ne,
  or,
  sql,
  type InferSelectModel,
} from "drizzle-orm"
import type { getDB } from "../lib/db"
import {
  favorite,
  fileObject,
  fileObjectTag,
  folder,
  shareLink,
  workspaceSettings,
  auditLog,
} from "@bucketdrive/shared/db/schema"
import type { StorageProvider } from "./storage"
import type {
  ListTrashRequest,
  RestoreFileResponse,
  RestoreFolderResponse,
  TrashItem,
} from "@bucketdrive/shared"
import { getWorkspaceRoleForUser } from "../lib/workspace-membership"

type DB = ReturnType<typeof getDB>
type FileRow = InferSelectModel<typeof fileObject>
type FolderRow = InferSelectModel<typeof folder>

const DAY_MS = 24 * 60 * 60 * 1000

function splitFileName(name: string) {
  const lastDot = name.lastIndexOf(".")
  if (lastDot <= 0) {
    return { baseName: name, extension: "" }
  }

  return {
    baseName: name.slice(0, lastDot),
    extension: name.slice(lastDot),
  }
}

function dirnamePath(path: string) {
  if (!path || path === "/") return "/"
  const normalized = path.endsWith("/") ? path.slice(0, -1) : path
  const lastSlash = normalized.lastIndexOf("/")
  if (lastSlash <= 0) return "/"
  return normalized.slice(0, lastSlash)
}

function joinPath(parentPath: string | null, name: string) {
  if (!parentPath || parentPath === "/") {
    return `/${name}`
  }

  return `${parentPath}/${name}`
}

function computeDaysRemaining(deletedAt: string, retentionDays: number) {
  const deletedAtMs = new Date(deletedAt).getTime()
  if (Number.isNaN(deletedAtMs)) return retentionDays
  const elapsedDays = Math.floor((Date.now() - deletedAtMs) / DAY_MS)
  return Math.max(0, retentionDays - elapsedDays)
}

async function recordAudit(
  db: DB,
  params: {
    workspaceId: string
    actorId: string
    action: string
    resourceType: "file" | "folder" | "trash"
    resourceId?: string | null
    metadata?: Record<string, unknown> | null
  },
) {
  await db
    .insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      createdAt: new Date().toISOString(),
    })
    .run()
}

export async function getWorkspaceRole(db: DB, workspaceId: string, userId: string) {
  return getWorkspaceRoleForUser(db, workspaceId, userId)
}

export class TrashService {
  constructor(
    private db: DB,
    private storage: StorageProvider,
  ) {}

  async listTrash(workspaceId: string, query: typeof ListTrashRequest._type) {
    const retentionDays = await this.getRetentionDays(workspaceId)
    const files = await this.db
      .select()
      .from(fileObject)
      .where(and(eq(fileObject.workspaceId, workspaceId), eq(fileObject.isDeleted, true)))
      .all()

    const folders = await this.db
      .select()
      .from(folder)
      .where(and(eq(folder.workspaceId, workspaceId), eq(folder.isDeleted, true)))
      .all()

    const folderRows = await this.db
      .select()
      .from(folder)
      .where(eq(folder.workspaceId, workspaceId))
      .all()
    const folderById = new Map(folderRows.map((row) => [row.id, row]))

    const items: TrashItem[] = [
      ...files.map((row) => ({
        resourceType: "file" as const,
        id: row.id,
        name: row.originalName,
        originalLocation: row.folderId ? (folderById.get(row.folderId)?.path ?? "/") : "/",
        deletedAt: row.deletedAt ?? row.updatedAt,
        daysRemaining: computeDaysRemaining(row.deletedAt ?? row.updatedAt, retentionDays),
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        extension: row.extension,
      })),
      ...folders.map((row) => ({
        resourceType: "folder" as const,
        id: row.id,
        name: row.name,
        originalLocation: dirnamePath(row.path),
        deletedAt: row.deletedAt ?? row.updatedAt,
        daysRemaining: computeDaysRemaining(row.deletedAt ?? row.updatedAt, retentionDays),
        path: row.path,
      })),
    ]

    const searchTerm = query.q?.toLowerCase()
    const filtered = searchTerm
      ? items.filter((item) =>
          item.name.toLowerCase().includes(searchTerm) ||
          item.originalLocation.toLowerCase().includes(searchTerm),
        )
      : items

    const sorted = [...filtered].sort((a, b) => {
      const dir = query.order === "asc" ? 1 : -1

      switch (query.sort) {
        case "name":
          return a.name.localeCompare(b.name) * dir
        case "location":
          return a.originalLocation.localeCompare(b.originalLocation) * dir
        case "size":
          return ((a.resourceType === "file" ? a.sizeBytes : 0) -
            (b.resourceType === "file" ? b.sizeBytes : 0)) * dir
        case "deleted_at":
        default:
          return a.deletedAt.localeCompare(b.deletedAt) * dir
      }
    })

    const start = (query.page - 1) * query.limit
    const paged = sorted.slice(start, start + query.limit)

    return {
      data: paged,
      meta: {
        page: query.page,
        limit: query.limit,
        total: sorted.length,
        totalPages: Math.ceil(sorted.length / query.limit),
      },
    }
  }

  async softDeleteFile(params: { workspaceId: string; fileId: string; actorId: string }) {
    const now = new Date().toISOString()
    const file = await this.db
      .select()
      .from(fileObject)
      .where(and(eq(fileObject.id, params.fileId), eq(fileObject.workspaceId, params.workspaceId)))
      .get()

    if (!file) {
      throw new TrashServiceError("FILE_NOT_FOUND", "File not found", 404)
    }
    if (file.isDeleted) {
      throw new TrashServiceError("RESOURCE_DELETED", "File is already deleted", 410)
    }

    await this.db
      .update(fileObject)
      .set({ isDeleted: true, deletedAt: now, updatedAt: now })
      .where(eq(fileObject.id, file.id))
      .run()

    await this.deactivateFavorites([file.id])
    await this.deactivateShares([{ resourceType: "file", resourceId: file.id }], now)
    await recordAudit(this.db, {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: "file.deleted",
      resourceType: "file",
      resourceId: file.id,
      metadata: { fileName: file.originalName },
    })

    return { success: true as const, fileId: file.id }
  }

  async softDeleteFolder(params: { workspaceId: string; folderId: string; actorId: string }) {
    const now = new Date().toISOString()
    const target = await this.db
      .select()
      .from(folder)
      .where(and(eq(folder.id, params.folderId), eq(folder.workspaceId, params.workspaceId)))
      .get()

    if (!target) {
      throw new TrashServiceError("FOLDER_NOT_FOUND", "Folder not found", 404)
    }
    if (target.isDeleted) {
      throw new TrashServiceError("RESOURCE_DELETED", "Folder is already deleted", 410)
    }

    const tree = await this.collectFolderTree(params.workspaceId, params.folderId)
    const folderIds = tree.map((row) => row.id)
    const fileRows = folderIds.length
      ? await this.db
          .select()
          .from(fileObject)
          .where(
            and(
              eq(fileObject.workspaceId, params.workspaceId),
              inArray(fileObject.folderId, folderIds),
              eq(fileObject.isDeleted, false),
            ),
          )
          .all()
      : []

    if (fileRows.length > 0) {
      await this.db
        .update(fileObject)
        .set({ isDeleted: true, deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(fileObject.workspaceId, params.workspaceId),
            inArray(
              fileObject.id,
              fileRows.map((row) => row.id),
            ),
          ),
        )
        .run()
      await this.deactivateFavorites(fileRows.map((row) => row.id))
    }

    await this.db
      .update(folder)
      .set({ isDeleted: true, deletedAt: now, updatedAt: now })
      .where(inArray(folder.id, folderIds))
      .run()

    await this.deactivateShares(
      [
        ...folderIds.map((id) => ({ resourceType: "folder" as const, resourceId: id })),
        ...fileRows.map((row) => ({ resourceType: "file" as const, resourceId: row.id })),
      ],
      now,
    )

    for (const row of fileRows) {
      await recordAudit(this.db, {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        action: "file.deleted",
        resourceType: "file",
        resourceId: row.id,
        metadata: { fileName: row.originalName, deletedByFolderId: params.folderId },
      })
    }

    for (const row of tree) {
      await recordAudit(this.db, {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        action: "folder.deleted",
        resourceType: "folder",
        resourceId: row.id,
        metadata: { folderName: row.name, deletedByFolderId: params.folderId },
      })
    }

    return { success: true as const, folderId: params.folderId }
  }

  async restoreFile(params: {
    workspaceId: string
    fileId: string
    actorId: string
  }): Promise<zInfer<typeof RestoreFileResponse>> {
    const file = await this.db
      .select()
      .from(fileObject)
      .where(and(eq(fileObject.id, params.fileId), eq(fileObject.workspaceId, params.workspaceId)))
      .get()

    if (!file) {
      throw new TrashServiceError("FILE_NOT_FOUND", "File not found", 404)
    }
    if (!file.isDeleted) {
      throw new TrashServiceError("CONFLICT", "File is not in trash", 409)
    }

    const targetFolder = file.folderId
      ? await this.db
          .select()
          .from(folder)
          .where(and(eq(folder.id, file.folderId), eq(folder.workspaceId, params.workspaceId)))
          .get()
      : null

    const restoredToRoot = !targetFolder || targetFolder.isDeleted
    const restoredToFolderId = restoredToRoot ? null : targetFolder.id
    const restoredName = await this.getUniqueFileName(
      params.workspaceId,
      restoredToFolderId,
      file.originalName,
      file.id,
    )
    const extension = splitFileName(restoredName).extension.replace(/^\./, "") || null

    await this.db
      .update(fileObject)
      .set({
        isDeleted: false,
        deletedAt: null,
        folderId: restoredToFolderId,
        originalName: restoredName,
        extension,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(fileObject.id, file.id))
      .run()

    await this.reactivateFavorites([file.id])
    await recordAudit(this.db, {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: restoredToRoot ? "file.restored_to_root" : "file.restored",
      resourceType: "file",
      resourceId: file.id,
      metadata: {
        restoredName,
        restoredToFolderId,
        originalFolderId: file.folderId,
      },
    })

    return {
      success: true,
      fileId: file.id,
      restoredToFolderId,
      restoredName,
      restoredToRoot,
    }
  }

  async restoreFolder(params: {
    workspaceId: string
    folderId: string
    actorId: string
  }): Promise<zInfer<typeof RestoreFolderResponse>> {
    const target = await this.db
      .select()
      .from(folder)
      .where(and(eq(folder.id, params.folderId), eq(folder.workspaceId, params.workspaceId)))
      .get()

    if (!target) {
      throw new TrashServiceError("FOLDER_NOT_FOUND", "Folder not found", 404)
    }
    if (!target.isDeleted) {
      throw new TrashServiceError("CONFLICT", "Folder is not in trash", 409)
    }

    const allFolders = await this.db
      .select()
      .from(folder)
      .where(eq(folder.workspaceId, params.workspaceId))
      .all()
    const allFiles = await this.db
      .select()
      .from(fileObject)
      .where(eq(fileObject.workspaceId, params.workspaceId))
      .all()

    const folderById = new Map(allFolders.map((row) => [row.id, row]))
    const tree = this.collectFolderTreeFromRows(allFolders, params.folderId)
    const folderIds = tree.map((row) => row.id)
    const fileRows = allFiles.filter((row) => row.folderId !== null && folderIds.includes(row.folderId))

    const originalParent = target.parentFolderId ? folderById.get(target.parentFolderId) ?? null : null
    const restoredToRoot = !originalParent || originalParent.isDeleted
    const restoredToFolderId = restoredToRoot ? null : originalParent.id
    const restoredName = await this.getUniqueFolderName(
      params.workspaceId,
      restoredToFolderId,
      target.name,
      target.id,
    )

    const restoredPathById = new Map<string, string>()
    const rootPath = joinPath(restoredToRoot ? null : originalParent.path, restoredName)
    restoredPathById.set(target.id, rootPath)

    await this.db
      .update(folder)
      .set({
        isDeleted: false,
        deletedAt: null,
        parentFolderId: restoredToFolderId,
        name: restoredName,
        path: rootPath,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(folder.id, target.id))
      .run()

    const descendants = tree
      .filter((row) => row.id !== target.id)
      .sort((a, b) => a.path.length - b.path.length)

    for (const row of descendants) {
      const parentPath = row.parentFolderId ? restoredPathById.get(row.parentFolderId) ?? null : null
      const nextPath = joinPath(parentPath, row.name)
      restoredPathById.set(row.id, nextPath)

      await this.db
        .update(folder)
        .set({
          isDeleted: false,
          deletedAt: null,
          path: nextPath,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(folder.id, row.id))
        .run()
    }

    if (fileRows.length > 0) {
      await this.db
        .update(fileObject)
        .set({
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(inArray(fileObject.id, fileRows.map((row) => row.id)))
        .run()
      await this.reactivateFavorites(fileRows.map((row) => row.id))
    }

    await recordAudit(this.db, {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: restoredToRoot ? "folder.restored_to_root" : "folder.restored",
      resourceType: "folder",
      resourceId: target.id,
      metadata: {
        restoredName,
        restoredToFolderId,
        originalParentFolderId: target.parentFolderId,
        restoredDescendantCount: descendants.length,
        restoredFileCount: fileRows.length,
      },
    })

    return {
      success: true,
      folderId: target.id,
      restoredToFolderId,
      restoredName,
      restoredToRoot,
    }
  }

  async permanentlyDeleteFile(params: {
    workspaceId: string
    fileId: string
    actorId: string
    action?: string
  }) {
    const file = await this.db
      .select()
      .from(fileObject)
      .where(and(eq(fileObject.id, params.fileId), eq(fileObject.workspaceId, params.workspaceId)))
      .get()

    if (!file) {
      throw new TrashServiceError("FILE_NOT_FOUND", "File not found", 404)
    }
    if (!file.isDeleted) {
      throw new TrashServiceError("CONFLICT", "File must be in trash before permanent deletion", 409)
    }

    await this.purgeFiles(params.workspaceId, [file], params.actorId, params.action ?? "file.permanently_deleted")

    return { success: true as const, fileId: file.id }
  }

  async permanentlyDeleteFolder(params: {
    workspaceId: string
    folderId: string
    actorId: string
    action?: string
  }) {
    const target = await this.db
      .select()
      .from(folder)
      .where(and(eq(folder.id, params.folderId), eq(folder.workspaceId, params.workspaceId)))
      .get()

    if (!target) {
      throw new TrashServiceError("FOLDER_NOT_FOUND", "Folder not found", 404)
    }
    if (!target.isDeleted) {
      throw new TrashServiceError("CONFLICT", "Folder must be in trash before permanent deletion", 409)
    }

    const allFolders = await this.db
      .select()
      .from(folder)
      .where(eq(folder.workspaceId, params.workspaceId))
      .all()
    const tree = this.collectFolderTreeFromRows(allFolders, target.id)
    const folderIds = tree.map((row) => row.id)
    const files = folderIds.length
      ? await this.db
          .select()
          .from(fileObject)
          .where(
            and(eq(fileObject.workspaceId, params.workspaceId), inArray(fileObject.folderId, folderIds)),
          )
          .all()
      : []

    await this.purgeFiles(
      params.workspaceId,
      files,
      params.actorId,
      params.action === "folder.auto_purged" ? "file.auto_purged" : "file.permanently_deleted",
    )

    await this.deleteSharesForResources([
      ...folderIds.map((id) => ({ resourceType: "folder" as const, resourceId: id })),
    ])

    await this.db.delete(folder).where(inArray(folder.id, folderIds)).run()

    for (const row of tree.sort((a, b) => b.path.length - a.path.length)) {
      await recordAudit(this.db, {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        action: params.action ?? "folder.permanently_deleted",
        resourceType: "folder",
        resourceId: row.id,
        metadata: { folderName: row.name, path: row.path },
      })
    }

    return { success: true as const, folderId: params.folderId }
  }

  async purgeExpiredTrash(actorId = "system") {
    const settings = await this.db
      .select()
      .from(workspaceSettings)
      .all()
    const retentionByWorkspaceId = new Map(
      settings.map((row) => [row.workspaceId, row.trashRetentionDays]),
    )

    const deletedFiles = await this.db
      .select()
      .from(fileObject)
      .where(eq(fileObject.isDeleted, true))
      .all()
    const deletedFolders = await this.db
      .select()
      .from(folder)
      .where(eq(folder.isDeleted, true))
      .all()

    const expiredFiles = deletedFiles.filter((row) =>
      this.isExpired(row.workspaceId, row.deletedAt, retentionByWorkspaceId),
    )

    const filesByWorkspace = new Map<string, FileRow[]>()
    for (const row of expiredFiles) {
      const current = filesByWorkspace.get(row.workspaceId) ?? []
      current.push(row)
      filesByWorkspace.set(row.workspaceId, current)
    }

    let purgedFiles = 0
    let purgedFolders = 0

    for (const [workspaceId, rows] of filesByWorkspace) {
      await this.purgeFiles(workspaceId, rows, actorId, "file.auto_purged")
      purgedFiles += rows.length
    }

    const remainingFiles = await this.db
      .select()
      .from(fileObject)
      .where(eq(fileObject.isDeleted, true))
      .all()
    const remainingDeletedFileFolderIds = new Set(
      remainingFiles.map((row) => row.folderId).filter((value): value is string => Boolean(value)),
    )

    const expiredFolders = deletedFolders
      .filter((row) => this.isExpired(row.workspaceId, row.deletedAt, retentionByWorkspaceId))
      .sort((a, b) => b.path.length - a.path.length)

    for (const row of expiredFolders) {
      if (remainingDeletedFileFolderIds.has(row.id)) continue

      const activeChildren = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(folder)
        .where(and(eq(folder.parentFolderId, row.id), eq(folder.isDeleted, false)))
        .get()
      const deletedChildren = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(folder)
        .where(and(eq(folder.parentFolderId, row.id), eq(folder.isDeleted, true)))
        .get()
      const childFiles = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(fileObject)
        .where(and(eq(fileObject.folderId, row.id), eq(fileObject.isDeleted, true)))
        .get()

      if ((activeChildren?.count ?? 0) > 0) continue
      if ((deletedChildren?.count ?? 0) > 0) continue
      if ((childFiles?.count ?? 0) > 0) continue

      await this.deleteSharesForResources([{ resourceType: "folder", resourceId: row.id }])
      await this.db.delete(folder).where(eq(folder.id, row.id)).run()
      await recordAudit(this.db, {
        workspaceId: row.workspaceId,
        actorId,
        action: "folder.auto_purged",
        resourceType: "folder",
        resourceId: row.id,
        metadata: { folderName: row.name, path: row.path },
      })
      purgedFolders += 1
    }

    return { purgedFiles, purgedFolders }
  }

  private async getRetentionDays(workspaceId: string) {
    const settings = await this.db
      .select({ trashRetentionDays: workspaceSettings.trashRetentionDays })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .get()
    return settings?.trashRetentionDays ?? 30
  }

  private isExpired(
    workspaceId: string,
    deletedAt: string | null,
    retentionByWorkspaceId: Map<string, number>,
  ) {
    if (!deletedAt) return false
    const retentionDays = retentionByWorkspaceId.get(workspaceId) ?? 30
    return Date.now() - new Date(deletedAt).getTime() >= retentionDays * DAY_MS
  }

  private async deactivateFavorites(fileIds: string[]) {
    if (fileIds.length === 0) return
    await this.db
      .update(favorite)
      .set({ isActive: false })
      .where(inArray(favorite.fileObjectId, fileIds))
      .run()
  }

  private async reactivateFavorites(fileIds: string[]) {
    if (fileIds.length === 0) return
    await this.db
      .update(favorite)
      .set({ isActive: true })
      .where(inArray(favorite.fileObjectId, fileIds))
      .run()
  }

  private async deactivateShares(
    resources: Array<{ resourceType: "file" | "folder"; resourceId: string }>,
    now: string,
  ) {
    if (resources.length === 0) return
    const shareIds = await this.findShareIdsForResources(resources)
    if (shareIds.length === 0) return
    await this.db
      .update(shareLink)
      .set({ isActive: false, updatedAt: now })
      .where(inArray(shareLink.id, shareIds))
      .run()
  }

  private async deleteSharesForResources(resources: Array<{ resourceType: "file" | "folder"; resourceId: string }>) {
    const shareIds = await this.findShareIdsForResources(resources)
    if (shareIds.length === 0) return
    await this.db.delete(shareLink).where(inArray(shareLink.id, shareIds)).run()
  }

  private async findShareIdsForResources(
    resources: Array<{ resourceType: "file" | "folder"; resourceId: string }>,
  ) {
    const fileIds = resources.filter((r) => r.resourceType === "file").map((r) => r.resourceId)
    const folderIds = resources.filter((r) => r.resourceType === "folder").map((r) => r.resourceId)
    const conditions = []

    if (fileIds.length > 0) {
      conditions.push(and(eq(shareLink.resourceType, "file"), inArray(shareLink.resourceId, fileIds)))
    }
    if (folderIds.length > 0) {
      conditions.push(and(eq(shareLink.resourceType, "folder"), inArray(shareLink.resourceId, folderIds)))
    }

    if (conditions.length === 0) return []

    const rows = await this.db
      .select({ id: shareLink.id })
      .from(shareLink)
      .where(or(...conditions))
      .all()

    return rows.map((row) => row.id)
  }

  private async getUniqueFileName(
    workspaceId: string,
    folderId: string | null,
    requestedName: string,
    excludeFileId?: string,
  ) {
    const rows = await this.db
      .select({ id: fileObject.id, originalName: fileObject.originalName })
      .from(fileObject)
      .where(
        and(
          eq(fileObject.workspaceId, workspaceId),
          folderId === null ? isNull(fileObject.folderId) : eq(fileObject.folderId, folderId),
          eq(fileObject.isDeleted, false),
          excludeFileId ? ne(fileObject.id, excludeFileId) : undefined,
        ),
      )
      .all()

    const names = new Set(rows.map((row) => row.originalName.toLowerCase()))
    if (!names.has(requestedName.toLowerCase())) {
      return requestedName
    }

    const { baseName, extension } = splitFileName(requestedName)
    const attempt = `${baseName} (restored)${extension}`
    if (!names.has(attempt.toLowerCase())) {
      return attempt
    }

    let index = 2
    while (names.has(`${baseName} (restored ${String(index)})${extension}`.toLowerCase())) {
      index += 1
    }

    return `${baseName} (restored ${String(index)})${extension}`
  }

  private async getUniqueFolderName(
    workspaceId: string,
    parentFolderId: string | null,
    requestedName: string,
    excludeFolderId?: string,
  ) {
    const rows = await this.db
      .select({ id: folder.id, name: folder.name })
      .from(folder)
      .where(
        and(
          eq(folder.workspaceId, workspaceId),
          parentFolderId === null ? isNull(folder.parentFolderId) : eq(folder.parentFolderId, parentFolderId),
          eq(folder.isDeleted, false),
          excludeFolderId ? ne(folder.id, excludeFolderId) : undefined,
        ),
      )
      .all()

    const names = new Set(rows.map((row) => row.name.toLowerCase()))
    if (!names.has(requestedName.toLowerCase())) {
      return requestedName
    }

    const attempt = `${requestedName} (restored)`
    if (!names.has(attempt.toLowerCase())) {
      return attempt
    }

    let index = 2
    while (names.has(`${requestedName} (restored ${String(index)})`.toLowerCase())) {
      index += 1
    }

    return `${requestedName} (restored ${String(index)})`
  }

  private async collectFolderTree(workspaceId: string, folderId: string) {
    const allFolders = await this.db
      .select()
      .from(folder)
      .where(eq(folder.workspaceId, workspaceId))
      .all()
    return this.collectFolderTreeFromRows(allFolders, folderId)
  }

  private collectFolderTreeFromRows(rows: FolderRow[], folderId: string) {
    const childrenByParentId = new Map<string, FolderRow[]>()
    const root = rows.find((row) => row.id === folderId)
    if (!root) return []

    for (const row of rows) {
      if (!row.parentFolderId) continue
      const current = childrenByParentId.get(row.parentFolderId) ?? []
      current.push(row)
      childrenByParentId.set(row.parentFolderId, current)
    }

    const result: FolderRow[] = []
    const queue: FolderRow[] = [root]
    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) continue
      result.push(current)
      const children = childrenByParentId.get(current.id) ?? []
      queue.push(...children)
    }

    return result
  }

  private async purgeFiles(
    workspaceId: string,
    files: FileRow[],
    actorId: string,
    action: string,
  ) {
    if (files.length === 0) return
    const fileIds = files.map((row) => row.id)

    for (const row of files) {
      await this.storage.delete(row.storageKey)
    }

    await this.deleteSharesForResources(fileIds.map((id) => ({ resourceType: "file" as const, resourceId: id })))
    await this.db.delete(fileObjectTag).where(inArray(fileObjectTag.fileObjectId, fileIds)).run()
    await this.db.delete(favorite).where(inArray(favorite.fileObjectId, fileIds)).run()
    await this.db.delete(fileObject).where(inArray(fileObject.id, fileIds)).run()

    for (const row of files) {
      await recordAudit(this.db, {
        workspaceId,
        actorId,
        action,
        resourceType: "file",
        resourceId: row.id,
        metadata: { fileName: row.originalName, storageKey: row.storageKey },
      })
    }
  }
}

export class TrashServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message)
    this.name = "TrashServiceError"
  }
}

type zInfer<T extends { _type: unknown }> = T["_type"]
