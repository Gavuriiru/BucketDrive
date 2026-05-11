import { create } from "zustand"

type UndoActionType =
  | "file.move"
  | "file.rename"
  | "file.delete"
  | "folder.move"
  | "folder.rename"
  | "folder.delete"

interface UndoAction {
  id: string
  type: UndoActionType
  description: string
  payload: Record<string, unknown>
}

interface UndoStackState {
  stack: UndoAction[]
  canUndo: boolean
  push: (action: Omit<UndoAction, "id">) => string
  pop: () => UndoAction | undefined
  peek: () => UndoAction | undefined
  clear: () => void
}

let undoIdCounter = 0

export const useUndoStore = create<UndoStackState>((set, get) => ({
  stack: [],
  canUndo: false,

  push: (action) => {
    const id = `undo-${String(++undoIdCounter)}`
    set((state) => {
      const next = [...state.stack, { id, ...action }]
      if (next.length > 50) next.shift()
      return { stack: next, canUndo: true }
    })
    return id
  },

  pop: () => {
    const state = get()
    const next = [...state.stack]
    const last = next.pop()
    set({ stack: next, canUndo: next.length > 0 })
    return last
  },

  peek: () => {
    const state = get()
    return state.stack[state.stack.length - 1]
  },

  clear: () => {
    set({ stack: [], canUndo: false })
  },
}))

export type { UndoAction, UndoActionType }
