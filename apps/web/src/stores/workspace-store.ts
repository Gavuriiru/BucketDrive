import { create } from "zustand"

export interface WorkspaceData {
  id: string
  name: string
  slug: string
  ownerId: string
  role: string
  storageQuotaBytes: number
  createdAt: string
  updatedAt: string
}

interface WorkspaceState {
  currentWorkspaceId: string | null
  workspaces: WorkspaceData[]
  setWorkspaces: (workspaces: WorkspaceData[]) => void
  setCurrentWorkspaceId: (id: string | null) => void
  getCurrentWorkspace: () => WorkspaceData | null
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspaceId: null,
  workspaces: [],
  setWorkspaces: (workspaces) => {
    const state = get()
    const validId = workspaces.find((w) => w.id === state.currentWorkspaceId)
      ? state.currentWorkspaceId
      : workspaces[0]?.id ?? null
    set({ workspaces, currentWorkspaceId: validId })
  },
  setCurrentWorkspaceId: (id) => { set({ currentWorkspaceId: id }) },
  getCurrentWorkspace: () => {
    const state = get()
    return state.workspaces.find((w) => w.id === state.currentWorkspaceId) ?? state.workspaces[0] ?? null
  },
}))

export function useSetWorkspaces(): (workspaces: WorkspaceData[]) => void {
  return useWorkspaceStore((s) => s.setWorkspaces)
}

export function useCurrentWorkspaceId(): string | null {
  return useWorkspaceStore((s) => s.currentWorkspaceId)
}
