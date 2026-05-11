/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { CommandPalette } from "@/components/features/command-palette"
import { useCommandPaletteShortcut } from "@/hooks/use-command-palette-shortcut"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  useCommandPaletteShortcut()

  return (
    <div className="flex h-screen flex-col bg-bg-primary">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  )
}
