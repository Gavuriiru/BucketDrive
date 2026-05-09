import { create } from "zustand"

type SortField = "name" | "created_at" | "size" | "type"
type SortOrder = "asc" | "desc"
type ViewMode = "grid" | "list"

interface ExplorerState {
  viewMode: ViewMode
  currentFolderId: string | null
  sort: SortField
  order: SortOrder
  setViewMode: (mode: ViewMode) => void
  setCurrentFolderId: (id: string | null) => void
  setSort: (sort: SortField) => void
  setOrder: (order: SortOrder) => void
  navigateTo: (folderId: string | null) => void
  navigateToRoot: () => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  viewMode: "grid",
  currentFolderId: null,
  sort: "name",
  order: "asc",
  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
  setSort: (sort) => set({ sort }),
  setOrder: (order) => set({ order }),
  navigateTo: (folderId) => set({ currentFolderId: folderId }),
  navigateToRoot: () => set({ currentFolderId: null }),
}))

export type { SortField, SortOrder, ViewMode }
