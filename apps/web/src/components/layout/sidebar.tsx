import { Link } from "@tanstack/react-router"
import { Files, Share2, Trash2, Settings, HardDrive } from "lucide-react"

const navItems = [
  { to: "/dashboard", icon: Files, label: "Files" },
  { to: "/dashboard", icon: Share2, label: "Shared" },
  { to: "/dashboard", icon: Trash2, label: "Trash" },
  { to: "/dashboard", icon: HardDrive, label: "Storage" },
  { to: "/dashboard", icon: Settings, label: "Settings" },
]

export function Sidebar() {
  return (
    <aside className="flex w-sidebar flex-col border-r border-border-muted bg-bg-secondary">
      <div className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary [&.active]:bg-surface-active [&.active]:text-text-primary"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
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
