import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "light" | "dark" | "system"

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyThemeClass(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

function cycleTheme(current: Theme): Theme {
  if (current === "dark") return "light"
  if (current === "light") return "system"
  return "dark"
}

interface AppState {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isSidebarOpen: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "system",
      resolvedTheme: "dark",
      setTheme: (theme) => {
        const resolved = getResolvedTheme(theme)
        applyThemeClass(resolved)
        set({ theme, resolvedTheme: resolved })
      },
      toggleTheme: () => {
        const next = cycleTheme(get().theme)
        const resolved = getResolvedTheme(next)
        applyThemeClass(resolved)
        set({ theme: next, resolvedTheme: resolved })
      },
      isSidebarOpen: true,
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
      },
    }),
    {
      name: "bucketdrive-theme",
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)

// Apply theme immediately on module evaluation to prevent flash
const initialTheme = useAppStore.getState().theme
const initialResolved = getResolvedTheme(initialTheme)
applyThemeClass(initialResolved)
useAppStore.setState({ resolvedTheme: initialResolved })

// Listen for system preference changes when theme is "system"
if (typeof window !== "undefined") {
  const mql = window.matchMedia("(prefers-color-scheme: dark)")
  const handleChange = (e: MediaQueryListEvent) => {
    if (useAppStore.getState().theme === "system") {
      const resolved = e.matches ? "dark" : "light"
      applyThemeClass(resolved)
      useAppStore.setState({ resolvedTheme: resolved })
    }
  }
  mql.addEventListener("change", handleChange)
}
