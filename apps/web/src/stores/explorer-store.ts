import { create } from "zustand"

type SortField = "name" | "created_at" | "size" | "type"
type SortOrder = "asc" | "desc"
type ViewMode = "grid" | "list"

interface ClipboardState {
  action: "copy" | "cut"
  fileIds: string[]
  folderIds: string[]
}

interface ExplorerState {
  viewMode: ViewMode
  currentFolderId: string | null
  sort: SortField
  order: SortOrder
  selectedFileIds: string[]
  selectedFolderIds: string[]
  focusedItemId: string | null
  focusedItemType: "file" | "folder" | null
  lastClickedItemId: string | null
  lastClickedItemIndex: number | null
  clipboard: ClipboardState | null
  previewFileId: string | null

  setViewMode: (mode: ViewMode) => void
  setCurrentFolderId: (id: string | null) => void
  setSort: (sort: SortField) => void
  setOrder: (order: SortOrder) => void
  navigateTo: (folderId: string | null) => void
  navigateToRoot: () => void

  selectItem: (id: string, type: "file" | "folder", index: number) => void
  toggleSelect: (id: string, type: "file" | "folder") => void
  selectRange: (ids: string[], type: "file" | "folder", lastIndex: number) => void
  selectAll: (fileIds: string[], folderIds: string[]) => void
  clearSelection: () => void
  setFocusedItem: (id: string | null, type: "file" | "folder" | null) => void
  setClipboard: (clipboard: ClipboardState | null) => void
  setPreviewFileId: (id: string | null) => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  viewMode: "grid",
  currentFolderId: null,
  sort: "name",
  order: "asc",
  selectedFileIds: [],
  selectedFolderIds: [],
  focusedItemId: null,
  focusedItemType: null,
  lastClickedItemId: null,
  lastClickedItemIndex: null,
  clipboard: null,
  previewFileId: null,

  setViewMode: (mode) => {
    set({ viewMode: mode })
  },
  setCurrentFolderId: (id) => {
    set({ currentFolderId: id })
  },
  setSort: (sort) => {
    set({ sort })
  },
  setOrder: (order) => {
    set({ order })
  },
  navigateTo: (folderId) => {
    set({
      currentFolderId: folderId,
      selectedFileIds: [],
      selectedFolderIds: [],
      focusedItemId: null,
      focusedItemType: null,
      lastClickedItemId: null,
      lastClickedItemIndex: null,
    })
  },
  navigateToRoot: () => {
    set({
      currentFolderId: null,
      selectedFileIds: [],
      selectedFolderIds: [],
      focusedItemId: null,
      focusedItemType: null,
      lastClickedItemId: null,
      lastClickedItemIndex: null,
    })
  },

  selectItem: (id, type, index) => {
    set({
      selectedFileIds: type === "file" ? [id] : [],
      selectedFolderIds: type === "folder" ? [id] : [],
      lastClickedItemId: id,
      lastClickedItemIndex: index,
      focusedItemId: id,
      focusedItemType: type,
    })
  },

  toggleSelect: (id, type) => {
    set((state) => {
      const result =
        type === "file"
          ? state.selectedFileIds.includes(id)
            ? state.selectedFileIds.filter((fid) => fid !== id)
            : [...state.selectedFileIds, id]
          : state.selectedFolderIds.includes(id)
            ? state.selectedFolderIds.filter((fid) => fid !== id)
            : [...state.selectedFolderIds, id]

      return type === "file"
        ? { selectedFileIds: result, lastClickedItemId: id }
        : { selectedFolderIds: result, lastClickedItemId: id }
    })
  },

  selectRange: (ids, type, lastIndex) => {
    set((state) => {
      const current =
        type === "file" ? state.selectedFileIds : state.selectedFolderIds
      const merged = [...new Set([...current, ...ids])]
      return type === "file"
        ? { selectedFileIds: merged, lastClickedItemIndex: lastIndex }
        : { selectedFolderIds: merged, lastClickedItemIndex: lastIndex }
    })
  },

  selectAll: (fileIds, folderIds) => {
    set({
      selectedFileIds: fileIds,
      selectedFolderIds: folderIds,
      lastClickedItemId: null,
      lastClickedItemIndex: null,
    })
  },

  clearSelection: () => {
    set({
      selectedFileIds: [],
      selectedFolderIds: [],
      lastClickedItemId: null,
      lastClickedItemIndex: null,
    })
  },

  setFocusedItem: (id, type) => {
    set({ focusedItemId: id, focusedItemType: type })
  },

  setClipboard: (clipboard) => {
    set({ clipboard })
  },

  setPreviewFileId: (id) => {
    set({ previewFileId: id })
  },
}))

export type { SortField, SortOrder, ViewMode, ClipboardState }
