import type { Command } from "./types"
import { useNavigationCommands } from "./navigation"
import { useAppearanceCommandsFiltered } from "./appearance"
import { useFileOperationCommandsFiltered } from "./file-operations"

export type { Command, CommandCategory } from "./types"

export function useAllCommands(
  navigate: (opts: { to: string; search?: Record<string, unknown> }) => void,
  userRole?: string,
): Command[] {
  return [
    ...useNavigationCommands(navigate, userRole),
    ...useAppearanceCommandsFiltered(),
    ...useFileOperationCommandsFiltered(),
  ]
}
