import type { WorkspaceRole } from "../schemas/common"
import type { Permission } from "./permissions"
import { ROLE_PERMISSIONS } from "./permissions"

export interface CanContext {
  /** When true, grants inherited folder read access from parent to children. */
  hasParentReadAccess?: boolean
}

export function can(
  role: WorkspaceRole,
  permission: Permission,
  resourceOwnerId?: string,
  userId?: string,
): boolean {
  const allowed = ROLE_PERMISSIONS[role]

  if (allowed.includes(permission)) {
    return true
  }

  if (
    resourceOwnerId &&
    userId &&
    resourceOwnerId === userId &&
    role !== "viewer" &&
    role !== "guest"
  ) {
    const OWNER_OVERRIDE_PERMISSIONS: readonly Permission[] = [
      "files.delete",
      "files.restore",
      "folders.delete",
      "folders.restore",
    ]
    return OWNER_OVERRIDE_PERMISSIONS.includes(permission)
  }

  return false
}

/**
 * Evaluates permission with optional inheritance rules.
 *
 * Folder read permission is inherited down the tree: if a user has
 * `folders.read` for a parent, they implicitly have it for all children.
 * This applies to breadcrumbs, tree navigation, and search.
 */
export function canWithInheritance(
  role: WorkspaceRole,
  permission: Permission,
  context?: CanContext,
  resourceOwnerId?: string,
  userId?: string,
): boolean {
  const base = can(role, permission, resourceOwnerId, userId)
  if (base) return true

  if (
    permission === "folders.read" &&
    context?.hasParentReadAccess &&
    can(role, "folders.read")
  ) {
    return true
  }

  return false
}
