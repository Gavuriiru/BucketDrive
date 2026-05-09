import { useRef, useMemo, useCallback, useState } from "react"
import { Upload, LayoutGrid, List, Trash2, FolderPlus } from "lucide-react"
import { useFiles, useFolders, useBreadcrumbs, useWorkspaces, useRenameFile, useDeleteFile, useCreateFolder, useUpdateFolder, useDeleteFolder, api, useMoveFile } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { useUploadStore } from "@/stores/upload-store"
import { useExplorerStore } from "@/stores/explorer-store"
import { UploadDropZone } from "@/components/features/upload-drop-zone"
import { UploadQueue } from "@/components/features/upload-queue"
import { FileList } from "@/components/features/file-list"
import { FileGrid } from "@/components/features/file-grid"
import { Breadcrumbs } from "@/components/features/breadcrumbs"
import { ShareModal } from "@/components/features/share-modal"
import { useExplorerShortcuts } from "@/hooks/use-explorer-shortcuts"
import { DndContext, DragOverlay } from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import type { BreadcrumbItem } from "@/lib/api"

export function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
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
  const deleteFileMutation = useDeleteFile(workspaceId)
  const createFolderMutation = useCreateFolder(workspaceId)
  const updateFolderMutation = useUpdateFolder(workspaceId)
  const deleteFolderMutation = useDeleteFolder(workspaceId)
  const moveFileMutation = useMoveFile(workspaceId)

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [shareModal, setShareModal] = useState<{
    open: boolean
    resourceId: string
    resourceType: "file" | "folder"
    resourceName: string
  }>({ open: false, resourceId: "", resourceType: "file", resourceName: "" })

  const parseDragId = (dragId: string): { type: "file" | "folder"; id: string } | null => {
    const sep = dragId.indexOf("-")
    if (sep === -1) return null
    const type = dragId.slice(0, sep)
    const id = dragId.slice(sep + 1)
    if (type !== "file" && type !== "folder") return null
    return { type, id }
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const current = event.active.id as string
    setActiveDragId(current)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      const { active, over } = event
      if (!over) return

      const source = parseDragId(active.id as string)
      const target = parseDragId(over.id as string)

      if (!source || !target) return
      if (source.id === target.id) return
      if (target.type !== "folder") return

      if (source.type === "file") {
        moveFileMutation.mutate({ fileId: source.id, folderId: target.id })
      } else {
        updateFolderMutation.mutate({ folderId: source.id, parentFolderId: target.id })
      }
    },
    [moveFileMutation, updateFolderMutation],
  )

  const activeDragItem = useMemo(() => {
    if (!activeDragId) return null
    const parsed = parseDragId(activeDragId)
    if (!parsed) return null
    if (parsed.type === "file") {
      const file = files.find((f) => f.id === parsed.id)
      return file ? { name: file.originalName, type: "file" as const } : null
    }
    const folder = folders.find((f) => f.id === parsed.id)
    return folder ? { name: folder.name, type: "folder" as const } : null
  }, [activeDragId, files, folders])

  const handleItemDrop = useCallback(
    (_sourceId: string, _sourceType: "file" | "folder", _targetFolderId: string) => {
      // Drag-drop handled by DndContext handleDragEnd
    },
    [],
  )

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
    const fileCount = selectedFileIds.length
    const folderCount = selectedFolderIds.length
    const totalCount = fileCount + folderCount
    if (totalCount === 0) return

    const confirmed = window.confirm(
      totalCount === 1
        ? "Delete this item? It will be moved to trash."
        : `Delete ${totalCount} items? They will be moved to trash.`,
    )
    if (confirmed) {
      for (const fileId of selectedFileIds) {
        deleteFileMutation.mutate({ fileId })
      }
      for (const folderId of selectedFolderIds) {
        deleteFolderMutation.mutate({ folderId })
      }
      clearSelection()
    }
  }, [selectedFileIds, selectedFolderIds, deleteFileMutation, deleteFolderMutation, clearSelection])

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
        if (type === "file") {
          renameMutation.mutate({ fileId: id, name: newName.trim() })
        } else {
          updateFolderMutation.mutate({ folderId: id, name: newName.trim() })
        }
      }
    },
    [files, folders, renameMutation, updateFolderMutation],
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

  const handleCreateFolder = () => {
    const name = window.prompt("Folder name:")
    if (name && name.trim()) {
      createFolderMutation.mutate({
        name: name.trim(),
        parentFolderId: currentFolderId,
      })
    }
  }

  const handleContextMove = useCallback(
    (id: string, type: "file" | "folder") => {
      const destFolderId = window.prompt("Enter destination folder ID (or leave blank for root):")
      if (destFolderId === null) return
      const targetId = destFolderId.trim() || null
      if (type === "file") {
        void api.patch(`/api/workspaces/${workspaceId}/files/${id}`, { folderId: targetId })
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
            void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
          })
          .catch(console.error)
      } else {
        updateFolderMutation.mutate({ folderId: id, parentFolderId: targetId })
      }
    },
    [workspaceId, updateFolderMutation],
  )

  const handleContextShare = useCallback(
    (id: string, type: "file" | "folder") => {
      const item = type === "file" ? files.find((f) => f.id === id) : folders.find((f) => f.id === id)
      const name = item ? ("originalName" in item ? item.originalName : item.name) : ""
      setShareModal({ open: true, resourceId: id, resourceType: type, resourceName: name })
    },
    [files, folders],
  )

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
            onClick={handleCreateFolder}
            className="inline-flex items-center gap-2 rounded-lg border border-border-muted bg-surface-default px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
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
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
              onContextDelete={(id, type) => {
                if (type === "folder") {
                  deleteFolderMutation.mutate({ folderId: id })
                } else {
                  deleteFileMutation.mutate({ fileId: id })
                }
                clearSelection()
              }}
              onContextFavorite={(id) => {
                console.warn("Favorites coming in Day 15", id)
              }}
              onContextMove={handleContextMove}
              onContextShare={handleContextShare}
              onItemDrop={handleItemDrop}
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
              onContextDelete={(id, type) => {
                if (type === "folder") {
                  deleteFolderMutation.mutate({ folderId: id })
                } else {
                  deleteFileMutation.mutate({ fileId: id })
                }
                clearSelection()
              }}
              onContextFavorite={(id) => {
                console.warn("Favorites coming in Day 15", id)
              }}
              onContextMove={handleContextMove}
              onContextShare={handleContextShare}
              onItemDrop={handleItemDrop}
            />
          )}
          <DragOverlay dropAnimation={null}>
            {activeDragItem ? (
              <div className="flex items-center gap-2 rounded-lg border border-accent bg-surface-default px-3 py-2 shadow-lg">
                {activeDragItem.type === "folder" ? (
                  <FolderPlus className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <Upload className="h-4 w-4 text-text-tertiary" />
                )}
                <span className="text-sm font-medium text-text-primary">{activeDragItem.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {workspaceId && <UploadQueue workspaceId={workspaceId} />}

      <ShareModal
        open={shareModal.open}
        onOpenChange={(open) => setShareModal((prev) => ({ ...prev, open }))}
        workspaceId={workspaceId ?? ""}
        resourceId={shareModal.resourceId}
        resourceType={shareModal.resourceType}
        resourceName={shareModal.resourceName}
      />
    </div>
  )
}
