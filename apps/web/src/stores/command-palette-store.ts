/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { create } from "zustand"

interface CommandPaletteState {
  isOpen: boolean
  query: string
  open: () => void
  close: () => void
  toggle: () => void
  setQuery: (query: string) => void
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  query: "",
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: "" }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen, query: state.isOpen ? "" : state.query })),
  setQuery: (query) => set({ query }),
}))
