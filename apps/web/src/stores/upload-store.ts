import { create } from "zustand"

export type UploadStatus = "queued" | "uploading" | "completed" | "failed" | "cancelled"

export interface UploadItem {
  id: string
  file: File
  fileName: string
  fileSize: number
  mimeType: string
  progress: number
  status: UploadStatus
  uploadId?: string
  storageKey?: string
  error?: string
}

interface UploadState {
  items: UploadItem[]
  isOpen: boolean
  addFiles: (files: File[]) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<UploadItem>) => void
  setOpen: (open: boolean) => void
  clearCompleted: () => void
}

let idCounter = 0

export const useUploadStore = create<UploadState>((set) => ({
  items: [],
  isOpen: false,

  addFiles: (files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => {
      idCounter++
      return {
        id: `upload-${String(Date.now())}-${String(idCounter)}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        progress: 0,
        status: "queued" as const,
      }
    })
    set((state) => ({
      items: [...state.items, ...newItems],
      isOpen: true,
    }))
  },

  removeItem: (id: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },

  updateItem: (id: string, updates: Partial<UploadItem>) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }))
  },

  setOpen: (open: boolean) => {
    set({ isOpen: open })
  },

  clearCompleted: () => {
    set((state) => ({
      items: state.items.filter(
        (item) => item.status !== "completed" && item.status !== "cancelled",
      ),
    }))
  },
}))
