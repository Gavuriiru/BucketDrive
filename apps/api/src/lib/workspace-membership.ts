import type { WorkspaceRole } from "@bucketdrive/shared"

export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  const normalized = role?.split(",")[0]?.trim().toLowerCase()
  if (
    normalized === "owner" ||
    normalized === "admin" ||
    normalized === "manager" ||
    normalized === "editor" ||
    normalized === "viewer" ||
    normalized === "guest"
  ) {
    return normalized
  }
  return "viewer"
}
