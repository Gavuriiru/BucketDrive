import { can } from "./can"
import type { WorkspaceRole } from "../schemas/common"

export interface PolicyUser {
  id: string
  role: WorkspaceRole
}

export interface PolicyResource {
  id: string
  ownerId: string
}

export const FilePolicy = {
  canDelete(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "files.delete", resource.ownerId, user.id)
  },
  canShare(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "files.share", resource.ownerId, user.id)
  },
  canRename(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "files.rename", resource.ownerId, user.id)
  },
  canMove(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "files.move", resource.ownerId, user.id)
  },
  canRestore(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "files.restore", resource.ownerId, user.id)
  },
}

export const FolderPolicy = {
  canDelete(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "folders.delete", resource.ownerId, user.id)
  },
  canShare(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "folders.share", resource.ownerId, user.id)
  },
  canRename(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "folders.rename", resource.ownerId, user.id)
  },
  canMove(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "folders.move", resource.ownerId, user.id)
  },
  canRestore(user: PolicyUser, resource: PolicyResource): boolean {
    return can(user.role, "folders.restore", resource.ownerId, user.id)
  },
}
