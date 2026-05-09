import { create } from "zustand"

interface AppState {
  theme: "light" | "dark"
  toggleTheme: () => void
  isSidebarOpen: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: "dark",
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark"
      document.documentElement.classList.toggle("dark", next === "dark")
      return { theme: next }
    }),
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}))
