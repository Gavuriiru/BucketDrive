import { useRef, useMemo, useCallback } from "react"
import { Upload, LayoutGrid, List, Trash2 } from "lucide-react"
import { useFiles, useFolders, useBreadcrumbs, useWorkspaces, useRenameFile, useDeleteFile } from "@/lib/api"
import { useUploadStore } from "@/stores/upload-store"
import { useExplorerStore } from "@/stores/explorer-store"
import { UploadDropZone } from "@/components/features/upload-drop-zone"
import { UploadQueue } from "@/components/features/upload-queue"
import { FileList } from "@/components/features/file-list"
import { FileGrid } from "@/components/features/file-grid"
import { Breadcrumbs } from "@/components/features/breadcrumbs"
import { useExplorerShortcuts } from "@/hooks/use-explorer-shortcuts"
import type { BreadcrumbItem } from "@/lib/api"

export function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const addFiles = useUploadStore((s) => s.addFiles)
  const {
    viewMode,
    currentFolderId,
    sort,
    order,
    setViewMode,
    navigateTo,
    navigateToRoot,
    selectedFileIds,
    selectedFolderIds,
    clearSelection,
  } = useExplorerStore()

  const { data: workspacesData, isLoading: wsLoading } = useWorkspaces()

  const workspaceId = workspacesData?.data?.[0]?.id ?? null
  const workspaceName = workspacesData?.data?.[0]?.name ?? "Workspace"

  const { data: filesData, isLoading: filesLoading } = useFiles(workspaceId, {
    folderId: currentFolderId,
    sort,
    order,
    page: 1,
    limit: 100,
  })

  const { data: foldersData, isLoading: foldersLoading } = useFolders(workspaceId, currentFolderId)
  const { data: breadcrumbsData } = useBreadcrumbs(workspaceId, currentFolderId)

  const files = filesData?.data ?? []
  const folders = foldersData?.data ?? []
  const isLoading = filesLoading || foldersLoading

  const renameMutation = useRenameFile(workspaceId)
  const deleteMutation = useDeleteFile(workspaceId)

  const items = useMemo(
    () => [
      ...folders.map((f) => ({ id: f.id, type: "folder" as const })),
      ...files.map((f) => ({ id: f.id, type: "file" as const })),
    ],
    [folders, files],
  )

  const handleOpenItem = useCallback(
    (id: string, type: "file" | "folder") => {
      if (type === "folder") {
        navigateTo(id)
      } else {
        const file = files.find((f) => f.id === id)
        if (file) {
          handleContextDownload(file.id)
        }
      }
    },
    [files, navigateTo],
  )

  const handleDeleteSelected = useCallback(() => {
    const allIds = [...selectedFileIds, ...selectedFolderIds]
    if (allIds.length === 0) return
    const fileCount = selectedFileIds.length
    if (fileCount === 0) return
    const count = fileCount
    const confirmed = window.confirm(
      count === 1
        ? "Delete this file? It will be moved to trash."
        : `Delete ${count} files? They will be moved to trash.`,
    )
    if (confirmed) {
      for (const fileId of selectedFileIds) {
        deleteMutation.mutate({ fileId })
      }
      clearSelection()
    }
  }, [selectedFileIds, deleteMutation, clearSelection])

  const handleNavigateParent = useCallback(() => {
    if (currentFolderId && breadcrumbsData && breadcrumbsData.length > 1) {
      const parent = breadcrumbsData[breadcrumbsData.length - 2]
      if (parent) {
        navigateTo(parent.id)
      }
    } else {
      navigateToRoot()
    }
  }, [currentFolderId, breadcrumbsData, navigateTo, navigateToRoot])

  const handleRenameItem = useCallback(
    (id: string, type: "file" | "folder") => {
      const item = type === "file" ? files.find((f) => f.id === id) : folders.find((f) => f.id === id)
      const currentName = item ? ("originalName" in item ? item.originalName : item.name) : ""
      const newName = window.prompt("Rename to:", currentName)
      if (newName && newName.trim() && newName !== currentName) {
        renameMutation.mutate({ fileId: id, name: newName.trim() })
      }
    },
    [files, folders, renameMutation],
  )

  const handleContextDownload = useCallback(
    (fileId: string) => {
      const fetchUrl = async () => {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/files/${fileId}/download`,
          { credentials: "include" },
        )
        const data = (await res.json()) as { signedUrl?: string }
        if (data.signedUrl) {
          window.open(data.signedUrl, "_blank")
        }
      }
      fetchUrl().catch(console.error)
    },
    [workspaceId],
  )

  const { handleItemClick } = useExplorerShortcuts({
    items,
    containerRef,
    onOpenItem: handleOpenItem,
    onDeleteSelected: handleDeleteSelected,
    onNavigateParent: handleNavigateParent,
    onRenameItem: handleRenameItem,
  })

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      addFiles(files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFilesDrop = (files: File[]) => {
    addFiles(files)
  }

  const handleFolderClick = (folderId: string) => {
    navigateTo(folderId)
  }

  const handleBreadcrumbNavigate = (id: string | null) => {
    if (id === null) {
      navigateToRoot()
    } else {
      navigateTo(id)
    }
  }

  const rootBreadcrumb: BreadcrumbItem[] = [{ id: null, name: workspaceName }]
  const displayBreadcrumbs = currentFolderId && breadcrumbsData ? breadcrumbsData : rootBreadcrumb

  const totalSelected = selectedFileIds.length + selectedFolderIds.length

  if (wsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">No workspace found</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Create a workspace to start uploading files.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4">
        <Breadcrumbs
          items={displayBreadcrumbs}
          onNavigate={handleBreadcrumbNavigate}
          currentFolderId={currentFolderId}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Files</h1>
          <p className="text-xs text-text-tertiary">
            {filesData?.meta?.total ?? 0} files
            {foldersData?.data?.length ? ` · ${foldersData.data.length} folders` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-muted bg-surface-default p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-surface-active text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-surface-active text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleFileSelect}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFilesChosen}
            className="hidden"
          />
        </div>
      </div>

      {totalSelected > 1 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent bg-accent/10 px-4 py-2">
          <span className="text-sm font-medium text-text-primary">
            {totalSelected} items selected
          </span>
          <div className="flex-1" />
          <button
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-error transition-colors hover:bg-error/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </button>
          <button
            onClick={() => clearSelection()}
            className="rounded-md px-3 py-1.5 text-sm text-text-tertiary transition-colors hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 space-y-4" ref={containerRef}>
        <UploadDropZone onFilesDrop={handleFilesDrop} className="bg-surface-default" />
        {viewMode === "grid" ? (
          <FileGrid
            folders={folders}
            files={files}
            isLoading={isLoading}
            onFolderClick={handleFolderClick}
            onItemClick={handleItemClick}
            onContextOpen={handleOpenItem}
            onContextDownload={handleContextDownload}
            onContextRename={handleRenameItem}
            onContextDelete={(id) => {
              deleteMutation.mutate({ fileId: id })
              clearSelection()
            }}
            onContextFavorite={(id) => {
              console.warn("Favorites coming in Day 15", id)
            }}
          />
        ) : (
          <FileList
            folders={folders}
            files={files}
            isLoading={isLoading}
            onFolderClick={handleFolderClick}
            onItemClick={handleItemClick}
            onContextOpen={handleOpenItem}
            onContextDownload={handleContextDownload}
            onContextRename={handleRenameItem}
            onContextDelete={(id) => {
              deleteMutation.mutate({ fileId: id })
              clearSelection()
            }}
            onContextFavorite={(id) => {
              console.warn("Favorites coming in Day 15", id)
            }}
          />
        )}
      </div>

      {workspaceId && <UploadQueue workspaceId={workspaceId} />}
    </div>
  )
}
