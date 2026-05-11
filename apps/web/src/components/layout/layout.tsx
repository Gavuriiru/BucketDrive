/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { CommandPalette } from "@/components/features/command-palette"
import { useCommandPaletteShortcut } from "@/hooks/use-command-palette-shortcut"
import { ToastProvider } from "@/components/shared/toast-provider"
import { ToastContainer } from "@/components/shared/toast-container"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  useCommandPaletteShortcut()

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col bg-bg-primary">
        <Topbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <CommandPalette />
        <ToastContainer />
      </div>
    </ToastProvider>
  )
}
