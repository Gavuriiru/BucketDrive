import type { WorkspaceRole } from "../schemas/common"
import type { Permission } from "./permissions"
import { ROLE_PERMISSIONS } from "./permissions"

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
    role !== "viewer"
  ) {
    const OWNER_OVERRIDE_PERMISSIONS: readonly Permission[] = [
      "files.delete",
      "files.restore",
      "folders.delete",
    ]
    return OWNER_OVERRIDE_PERMISSIONS.includes(permission)
  }

  return false
}
