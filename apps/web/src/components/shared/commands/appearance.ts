/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Sun, LayoutGrid, List, type LucideIcon } from "lucide-react"
import { useI18n } from "@/lib/i18n"
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

function getAppearanceCommands(t: ReturnType<typeof useI18n>["t"]): AppearanceCommandDef[] {
  return [
    {
      id: "toggle-theme",
      title: t("commands.appearance.toggleDarkMode"),
      subtitle: t("commands.appearance.toggleThemeSubtitle"),
      icon: Sun,
      category: "appearance",
      keywords: ["theme", "dark", "light", "mode", "color"],
      action: () => {
        useAppStore.getState().toggleTheme()
      },
    },
    {
      id: "switch-grid",
      title: t("commands.appearance.switchToGrid"),
      subtitle: t("commands.appearance.gridViewSubtitle"),
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
      title: t("commands.appearance.switchToList"),
      subtitle: t("commands.appearance.listViewSubtitle"),
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

export function useAppearanceCommandsFiltered(): Command[] {
  const { t } = useI18n()
  return getAppearanceCommands(t)
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
