import { create } from "zustand"

type ToastVariant = "default" | "success" | "error" | "warning"

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant: ToastVariant
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, "id">) => string
  removeToast: (id: string) => void
  dismissAll: () => void
}

let toastIdCounter = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${String(++toastIdCounter)}`
    set((state) => ({
      toasts: [...state.toasts, { id, ...toast }],
    }))
    return id
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
  dismissAll: () => {
    set({ toasts: [] })
  },
}))

export function toast(options: Omit<ToastItem, "id">): string {
  return useToastStore.getState().addToast(options)
}

export function dismissToast(id: string): void {
  useToastStore.getState().removeToast(id)
}
