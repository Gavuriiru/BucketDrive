import type { LucideIcon } from "lucide-react"

export type CommandCategory = "navigation" | "file" | "appearance" | "search"

export interface Command {
  id: string
  title: string
  subtitle?: string
  icon?: LucideIcon
  category: CommandCategory
  keywords?: string[]
  shortcut?: string
  condition?: () => boolean
  action: () => void | Promise<void>
}
