/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-plus-operands */
import { Pencil, Trash2, FolderInput, Star, X, type LucideIcon } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useExplorerStore } from "@/stores/explorer-store"
import type { Command, CommandCategory } from "./types"

export const FILE_COMMAND_EVENT = "bucketdrive:file-command"
export type FileCommandAction = "rename" | "delete" | "move" | "favorite"

function dispatchFileCommand(action: FileCommandAction) {
  window.dispatchEvent(new CustomEvent<FileCommandAction>(FILE_COMMAND_EVENT, { detail: action }))
}

interface FileOperationCommandDef {
  id: string
  title: string
  subtitle?: string
  icon: LucideIcon
  category: CommandCategory
  keywords?: string[]
  condition?: () => boolean
  action: () => void
}

function getFileOperationCommands(t: ReturnType<typeof useI18n>["t"]): FileOperationCommandDef[] {
  return [
    {
      id: "file-rename",
      title: t("commands.fileOperations.renameSelected"),
      subtitle: t("commands.fileOperations.renameSubtitle"),
      icon: Pencil,
      category: "file",
      keywords: ["rename", "name", "edit"],
      condition: () => {
        const state = useExplorerStore.getState()
        const totalSelected = state.selectedFileIds.length + state.selectedFolderIds.length
        return totalSelected === 1
      },
      action: () => {
        dispatchFileCommand("rename")
      },
    },
    {
      id: "file-delete",
      title: t("commands.fileOperations.deleteSelected"),
      subtitle: t("commands.fileOperations.deleteSubtitle"),
      icon: Trash2,
      category: "file",
      keywords: ["delete", "trash", "remove"],
      condition: () => {
        const state = useExplorerStore.getState()
        return state.selectedFileIds.length + state.selectedFolderIds.length > 0
      },
      action: () => {
        dispatchFileCommand("delete")
      },
    },
    {
      id: "file-move",
      title: t("commands.fileOperations.moveSelected"),
      subtitle: t("commands.fileOperations.moveSubtitle"),
      icon: FolderInput,
      category: "file",
      keywords: ["move", "transfer", "folder"],
      condition: () => {
        const state = useExplorerStore.getState()
        return state.selectedFileIds.length + state.selectedFolderIds.length > 0
      },
      action: () => {
        dispatchFileCommand("move")
      },
    },
    {
      id: "file-favorite",
      title: t("commands.fileOperations.toggleFavorite"),
      subtitle: t("commands.fileOperations.favoriteSubtitle"),
      icon: Star,
      category: "file",
      keywords: ["favorite", "star", "bookmark"],
      condition: () => {
        const state = useExplorerStore.getState()
        return state.selectedFileIds.length === 1 && state.selectedFolderIds.length === 0
      },
      action: () => {
        dispatchFileCommand("favorite")
      },
    },
    {
      id: "file-clear-selection",
      title: t("commands.fileOperations.clearSelection"),
      subtitle: t("commands.fileOperations.clearSelectionSubtitle"),
      icon: X,
      category: "file",
      keywords: ["clear", "deselect", "selection"],
      condition: () => {
        const state = useExplorerStore.getState()
        return state.selectedFileIds.length + state.selectedFolderIds.length > 0
      },
      action: () => {
        useExplorerStore.getState().clearSelection()
      },
    },
  ]
}

export function useFileOperationCommandsFiltered(): Command[] {
  const { t } = useI18n()
  return getFileOperationCommands(t)
    .filter((def) => (def.condition ? def.condition() : true))
    .map((def) => ({
      id: def.id,
      title: def.title,
      subtitle: def.subtitle,
      icon: def.icon,
      category: def.category,
      keywords: def.keywords,
      action: def.action,
    }))
}
