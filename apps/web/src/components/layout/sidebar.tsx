/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions */
import { Link } from "@tanstack/react-router"
import { Files, Share2, Trash2, Settings, Link2, Shield, ScrollText, Users, Globe } from "lucide-react"
import { FolderTree } from "@/components/features/folder-tree"
import { useCurrentWorkspace } from "@/hooks/use-current-workspace"
import { usePlatformMe, useDashboardOverview } from "@/lib/api"
import { can } from "@bucketdrive/shared"

export function Sidebar() {
  const { workspace, workspaceId, role, workspaces, setCurrentId } = useCurrentWorkspace()
  const { data: me } = usePlatformMe()
  const { data: overview } = useDashboardOverview(workspaceId)

  const navItems = [
    { to: "/dashboard/files", icon: Files, label: "Files", visible: true },
    { to: "/shared", icon: Share2, label: "Shared With Me", visible: true },
    { to: "/dashboard/shares", icon: Link2, label: "Share Links", visible: true },
    { to: "/dashboard/trash", icon: Trash2, label: "Trash", visible: true },
    {
      to: "/dashboard",
      icon: Shield,
      label: "Admin Overview",
      visible: can(role ?? "viewer", "analytics.read"),
    },
    {
      to: "/dashboard/members",
      icon: Users,
      label: "Members",
      visible: can(role ?? "viewer", "users.read"),
    },
    {
      to: "/dashboard/audit",
      icon: ScrollText,
      label: "Audit",
      visible: can(role ?? "viewer", "audit.read"),
    },
    {
      to: "/dashboard/settings",
      icon: Settings,
      label: "Settings",
      visible: can(role ?? "viewer", "workspace.settings.read"),
    },
    {
      to: "/dashboard/platform",
      icon: Globe,
      label: "Platform",
      visible: me?.isPlatformAdmin ?? false,
    },
  ]

  return (
    <aside className="flex w-sidebar flex-col border-r border-border-muted bg-bg-secondary">
      <div className="flex flex-1 flex-col gap-1 p-3">
        {workspaces.length > 1 && (
          <div className="mb-2 px-3">
            <select
              value={workspaceId ?? ""}
              onChange={(e) => { setCurrentId(e.target.value) }}
              className="w-full rounded-lg border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {workspaces.length === 1 && workspace && (
          <div className="mb-2 px-3 py-1.5 text-sm font-medium text-text-primary">
            {workspace.name}
          </div>
        )}
        {navItems.filter((item) => item.visible).map((item) => (
          <Link
            key={item.label}
            to={item.to}
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary [&.active]:bg-surface-active [&.active]:text-text-primary"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <div className="my-1 h-px bg-border-muted" />
        <FolderTree />
      </div>
      <div className="border-t border-border-muted p-3">
        <div className="rounded-lg bg-surface-hover p-3 text-xs text-text-secondary">
          <div className="font-medium text-text-primary">Free Plan</div>
          {overview && (
            <>
              <div className="mt-1">
                {formatBytes(overview.summary.usedStorageBytes)} of{" "}
                {formatBytes(overview.summary.quotaBytes)} used
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-border-default">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${Math.min(
                      (overview.summary.usedStorageBytes / overview.summary.quotaBytes) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
