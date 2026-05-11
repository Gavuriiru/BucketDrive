import { create } from "zustand"
import { persist } from "zustand/middleware"

export type UploadStatus = "queued" | "uploading" | "paused" | "completed" | "failed" | "cancelled"

export interface UploadChunk {
  partNumber: number
  status: "pending" | "uploading" | "done" | "failed"
  etag?: string
  sizeBytes: number
}

export interface UploadItem {
  id: string
  file: File | null
  fileName: string
  fileSize: number
  mimeType: string
  progress: number
  status: UploadStatus
  uploadId?: string
  sessionId?: string
  storageKey?: string
  totalChunks?: number
  chunkSize?: number
  chunks: UploadChunk[]
  retryCount: number
  error?: string
}

interface PersistedUploadItem {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  progress: number
  status: UploadStatus
  uploadId?: string
  sessionId?: string
  storageKey?: string
  totalChunks?: number
  chunkSize?: number
  chunks: UploadChunk[]
  retryCount: number
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
  hydrateItems: (persisted: PersistedUploadItem[]) => void
}

let idCounter = 0

export const useUploadStore = create<UploadState>()(
  persist(
    (set) => ({
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
            chunks: [],
            retryCount: 0,
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

      hydrateItems: (persisted: PersistedUploadItem[]) => {
        set((state) => {
          const existingIds = new Set(state.items.map((i) => i.id))
          const hydrated = persisted
            .filter((p) => !existingIds.has(p.id) && p.status !== "completed" && p.status !== "cancelled")
            .map((p) => ({
              ...p,
              file: null as File | null,
              status: "paused" as const,
            }))
          return {
            items: [...state.items, ...hydrated],
            isOpen: hydrated.length > 0 ? true : state.isOpen,
          }
        })
      },
    }),
    {
      name: "bucketdrive-uploads",
      partialize: (state) => ({
        items: state.items.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          progress: item.progress,
          status: item.status,
          uploadId: item.uploadId,
          sessionId: item.sessionId,
          storageKey: item.storageKey,
          totalChunks: item.totalChunks,
          chunkSize: item.chunkSize,
          chunks: item.chunks,
          retryCount: item.retryCount,
          error: item.error,
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const persisted = state.items as PersistedUploadItem[]
        if (persisted.length > 0) {
          useUploadStore.getState().hydrateItems(persisted)
        }
      },
    },
  ),
)
