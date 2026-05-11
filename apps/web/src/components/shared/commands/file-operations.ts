/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-plus-operands */
import {
  Pencil,
  Trash2,
  FolderInput,
  Star,
  X,
  type LucideIcon,
} from "lucide-react"
import { useExplorerStore } from "@/stores/explorer-store"
import type { Command, CommandCategory } from "./types"

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

function getFileOperationCommands(): FileOperationCommandDef[] {
  return [
    {
      id: "file-rename",
      title: "Rename Selected",
      subtitle: "Rename the focused item",
      icon: Pencil,
      category: "file",
      keywords: ["rename", "name", "edit"],
      condition: () => {
        const state = useExplorerStore.getState()
        const totalSelected = state.selectedFileIds.length + state.selectedFolderIds.length
        return totalSelected === 1
      },
      action: () => {
        // Triggered via explorer shortcut hook or context menu
        // The palette just closes; user can use F2 after
        // This is a stub that could be wired to a rename modal
      },
    },
    {
      id: "file-delete",
      title: "Delete Selected",
      subtitle: "Move selected items to trash",
      icon: Trash2,
      category: "file",
      keywords: ["delete", "trash", "remove"],
      condition: () => {
        const state = useExplorerStore.getState()
        return state.selectedFileIds.length + state.selectedFolderIds.length > 0
      },
      action: () => {
        // Triggered via explorer shortcut hook
      },
    },
    {
      id: "file-move",
      title: "Move Selected",
      subtitle: "Move selected items to another folder",
      icon: FolderInput,
      category: "file",
      keywords: ["move", "transfer", "folder"],
      condition: () => {
        const state = useExplorerStore.getState()
        return state.selectedFileIds.length + state.selectedFolderIds.length > 0
      },
      action: () => {
        // Triggered via explorer shortcut hook or context menu
      },
    },
    {
      id: "file-favorite",
      title: "Toggle Favorite",
      subtitle: "Add or remove from favorites",
      icon: Star,
      category: "file",
      keywords: ["favorite", "star", "bookmark"],
      condition: () => {
        const state = useExplorerStore.getState()
        return state.selectedFileIds.length === 1 && state.selectedFolderIds.length === 0
      },
      action: () => {
        // Triggered via explorer shortcut hook or context menu
      },
    },
    {
      id: "file-clear-selection",
      title: "Clear Selection",
      subtitle: "Deselect all items",
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

export function getFileOperationCommandsFiltered(): Command[] {
  return getFileOperationCommands()
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
