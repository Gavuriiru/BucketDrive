import type { Command } from "./types"
import { getNavigationCommands } from "./navigation"
import { getAppearanceCommandsFiltered } from "./appearance"
import { getFileOperationCommandsFiltered } from "./file-operations"

export type { Command, CommandCategory } from "./types"

export function getAllCommands(
  navigate: (opts: { to: string; search?: Record<string, unknown> }) => void,
  userRole?: string,
): Command[] {
  return [
    ...getNavigationCommands(navigate, userRole),
    ...getAppearanceCommandsFiltered(),
    ...getFileOperationCommandsFiltered(),
  ]
}
