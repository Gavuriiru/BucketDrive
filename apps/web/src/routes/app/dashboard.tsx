import { useRef } from "react"
import { Upload } from "lucide-react"
import { useFiles, useWorkspaces } from "@/lib/api"
import { useUploadStore } from "@/stores/upload-store"
import { UploadDropZone } from "@/components/features/upload-drop-zone"
import { UploadQueue } from "@/components/features/upload-queue"
import { FileList } from "@/components/features/file-list"

export function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addFiles = useUploadStore((s) => s.addFiles)
  const { data: workspacesData, isLoading: wsLoading } = useWorkspaces()

  const workspaceId = workspacesData?.data?.[0]?.id ?? null
  const { data: filesData, isLoading: filesLoading } = useFiles(workspaceId)

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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Files</h1>
          <p className="text-xs text-text-tertiary">
            {workspacesData?.data?.[0]?.name ?? "Workspace"}
          </p>
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

      <div className="flex-1 space-y-4">
        <UploadDropZone onFilesDrop={handleFilesDrop} className="bg-surface-default" />
        <FileList files={filesData?.data ?? []} isLoading={filesLoading} />
      </div>

      {workspaceId && <UploadQueue workspaceId={workspaceId} />}
    </div>
  )
}
