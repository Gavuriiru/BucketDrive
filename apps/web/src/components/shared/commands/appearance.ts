/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Sun, LayoutGrid, List, type LucideIcon } from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { useExplorerStore } from "@/stores/explorer-store"
import type { Command, CommandCategory } from "./types"

interface AppearanceCommandDef {
  id: string
  title: string
  subtitle?: string
  icon: LucideIcon
  category: CommandCategory
  keywords?: string[]
  condition?: () => boolean
  action: () => void
}

function getAppearanceCommands(): AppearanceCommandDef[] {
  return [
    {
      id: "toggle-theme",
      title: "Toggle Dark Mode",
      subtitle: "Switch between light and dark theme",
      icon: Sun,
      category: "appearance",
      keywords: ["theme", "dark", "light", "mode", "color"],
      action: () => {
        useAppStore.getState().toggleTheme()
      },
    },
    {
      id: "switch-grid",
      title: "Switch to Grid View",
      subtitle: "Show files as cards",
      icon: LayoutGrid,
      category: "appearance",
      keywords: ["grid", "view", "cards", "layout"],
      condition: () => {
        const pathname = window.location.pathname
        return pathname === "/dashboard/files" && useExplorerStore.getState().viewMode === "list"
      },
      action: () => {
        useExplorerStore.getState().setViewMode("grid")
      },
    },
    {
      id: "switch-list",
      title: "Switch to List View",
      subtitle: "Show files as a table",
      icon: List,
      category: "appearance",
      keywords: ["list", "view", "table", "layout"],
      condition: () => {
        const pathname = window.location.pathname
        return pathname === "/dashboard/files" && useExplorerStore.getState().viewMode === "grid"
      },
      action: () => {
        useExplorerStore.getState().setViewMode("list")
      },
    },
  ]
}

export function getAppearanceCommandsFiltered(): Command[] {
  return getAppearanceCommands()
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
