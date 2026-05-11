/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { useEffect } from "react"
import { useCommandPaletteStore } from "@/stores/command-palette-store"

export function useCommandPaletteShortcut() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)

      if (isInput) return

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        useCommandPaletteStore.getState().toggle()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])
}
