/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import {
  FolderOpen,
  Share2,
  Trash2,
  Users,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"
import { useI18n } from "@/lib/i18n"
import type { Command, CommandCategory } from "./types"
import { can, type WorkspaceRole } from "@bucketdrive/shared"

interface NavigationCommandDef {
  id: string
  title: string
  subtitle?: string
  icon: LucideIcon
  to: string
  category: CommandCategory
  keywords?: string[]
  adminOnly?: boolean
}

function getNavigationDefs(t: ReturnType<typeof useI18n>["t"]): NavigationCommandDef[] {
  return [
    {
      id: "nav-files",
      title: t("commands.navigation.goToFiles"),
      subtitle: t("commands.navigation.openFileExplorer"),
      icon: FolderOpen,
      to: "/dashboard/files",
      category: "navigation",
      keywords: ["files", "explorer", "documents"],
    },
    {
      id: "nav-shares",
      title: t("commands.navigation.goToShareLinks"),
      subtitle: t("commands.navigation.manageShareLinks"),
      icon: Share2,
      to: "/dashboard/shares",
      category: "navigation",
      keywords: ["shares", "links", "public"],
    },
    {
      id: "nav-trash",
      title: t("commands.navigation.goToTrash"),
      subtitle: t("commands.navigation.viewDeletedItems"),
      icon: Trash2,
      to: "/dashboard/trash",
      category: "navigation",
      keywords: ["trash", "deleted", "recycle", "bin"],
    },
    {
      id: "nav-members",
      title: t("commands.navigation.goToMembers"),
      subtitle: t("commands.navigation.manageMembers"),
      icon: Users,
      to: "/dashboard/members",
      category: "navigation",
      keywords: ["members", "users", "team", "people"],
      adminOnly: true,
    },
    {
      id: "nav-settings",
      title: t("commands.navigation.goToSettings"),
      subtitle: t("commands.navigation.bucketSettings"),
      icon: Settings,
      to: "/dashboard/settings",
      category: "navigation",
      keywords: ["settings", "config", "preferences"],
      adminOnly: true,
    },
    {
      id: "nav-dashboard",
      title: t("commands.navigation.goToDashboard"),
      subtitle: t("commands.navigation.adminOverview"),
      icon: LayoutDashboard,
      to: "/dashboard",
      category: "navigation",
      keywords: ["dashboard", "overview", "analytics", "home"],
      adminOnly: true,
    },
  ]
}

function isAdminRole(role: string | undefined): boolean {
  return can((role ?? "viewer") as WorkspaceRole, "analytics.read")
}

export function useNavigationCommands(
  navigate: (opts: { to: string; search?: Record<string, unknown> }) => void,
  userRole?: string,
): Command[] {
  const { t } = useI18n()
  return getNavigationDefs(t)
    .filter((def) => {
      if (!def.adminOnly) return true
      return isAdminRole(userRole)
    })
    .map((def) => ({
      id: def.id,
      title: def.title,
      subtitle: def.subtitle,
      icon: def.icon,
      category: def.category,
      keywords: def.keywords,
      action: () => {
        navigate(
          def.to === "/dashboard/files"
            ? { to: def.to, search: { folderId: undefined, previewFileId: undefined } }
            : { to: def.to },
        )
      },
    }))
}
