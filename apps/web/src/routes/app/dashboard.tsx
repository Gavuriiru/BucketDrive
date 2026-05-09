import { useRef } from "react"
import { Upload, LayoutGrid, List } from "lucide-react"
import { useFiles, useFolders, useBreadcrumbs, useWorkspaces } from "@/lib/api"
import { useUploadStore } from "@/stores/upload-store"
import { useExplorerStore } from "@/stores/explorer-store"
import { UploadDropZone } from "@/components/features/upload-drop-zone"
import { UploadQueue } from "@/components/features/upload-queue"
import { FileList } from "@/components/features/file-list"
import { FileGrid } from "@/components/features/file-grid"
import { Breadcrumbs } from "@/components/features/breadcrumbs"
import type { BreadcrumbItem } from "@/lib/api"

export function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addFiles = useUploadStore((s) => s.addFiles)
  const {
    viewMode,
    currentFolderId,
    sort,
    order,
    setViewMode,
    navigateTo,
    navigateToRoot,
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

  const isLoading = filesLoading || foldersLoading

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

      <div className="flex-1 space-y-4">
        <UploadDropZone onFilesDrop={handleFilesDrop} className="bg-surface-default" />
        {viewMode === "grid" ? (
          <FileGrid
            folders={foldersData?.data ?? []}
            files={filesData?.data ?? []}
            isLoading={isLoading}
            onFolderClick={handleFolderClick}
          />
        ) : (
          <FileList
            folders={foldersData?.data ?? []}
            files={filesData?.data ?? []}
            isLoading={isLoading}
            onFolderClick={handleFolderClick}
          />
        )}
      </div>

      {workspaceId && <UploadQueue workspaceId={workspaceId} />}
    </div>
  )
}
