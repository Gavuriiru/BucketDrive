/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Link } from "@tanstack/react-router"
import { Files, Share2, Trash2, Settings, HardDrive, Link2, Shield, ScrollText, Users } from "lucide-react"
import { FolderTree } from "@/components/features/folder-tree"
import { useWorkspaces } from "@/lib/api"
import { can } from "@bucketdrive/shared"

export function Sidebar() {
  const { data } = useWorkspaces()
  const workspace = data?.data?.[0] ?? null
  const role = workspace?.role ?? "viewer"

  const navItems = [
    { to: "/dashboard/files", icon: Files, label: "Files", visible: true },
    { to: "/shared", icon: Share2, label: "Shared With Me", visible: true },
    { to: "/dashboard/shares", icon: Link2, label: "Share Links", visible: true },
    { to: "/dashboard/trash", icon: Trash2, label: "Trash", visible: true },
    {
      to: "/dashboard",
      icon: Shield,
      label: "Admin Overview",
      visible: can(role, "analytics.read"),
    },
    {
      to: "/dashboard/members",
      icon: Users,
      label: "Members",
      visible: can(role, "users.read"),
    },
    {
      to: "/dashboard/audit",
      icon: ScrollText,
      label: "Audit",
      visible: can(role, "audit.read"),
    },
    {
      to: "/dashboard/settings",
      icon: Settings,
      label: "Settings",
      visible: can(role, "workspace.settings.read"),
    },
    {
      to: "/dashboard",
      icon: HardDrive,
      label: "Storage",
      visible: can(role, "analytics.read"),
    },
  ]

  return (
    <aside className="flex w-sidebar flex-col border-r border-border-muted bg-bg-secondary">
      <div className="flex flex-1 flex-col gap-1 p-3">
        {navItems.filter((item) => item.visible).map((item) => (
          <Link
            key={item.label}
            to={item.to}
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
          <div className="mt-1">2.4 GB of 10 GB used</div>
          <div className="mt-1 h-1.5 rounded-full bg-border-default">
            <div className="h-full w-1/4 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </aside>
  )
}
