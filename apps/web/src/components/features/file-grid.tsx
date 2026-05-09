import { Folder, FolderOpen } from "lucide-react"
import type { FileObject, Folder as FolderType } from "@bucketdrive/shared"

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼"
  if (mimeType.startsWith("video/")) return "🎬"
  if (mimeType.startsWith("audio/")) return "🎵"
  if (mimeType.includes("pdf")) return "📄"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📽"
  if (mimeType.startsWith("text/")) return "📝"
  return "📁"
}

interface FileGridProps {
  folders: FolderType[]
  files: FileObject[]
  isLoading: boolean
  onFolderClick: (folderId: string) => void
}

export function FileGrid({ folders, files, isLoading, onFolderClick }: FileGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border-muted bg-surface-default p-4"
          >
            <div className="mx-auto mb-3 h-12 w-12 rounded-lg bg-surface-hover" />
            <div className="mx-auto mb-2 h-3 w-20 rounded bg-surface-hover" />
            <div className="mx-auto h-2.5 w-14 rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    )
  }

  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <Folder className="h-12 w-12 text-text-tertiary" />
        <p className="text-sm text-text-tertiary">No files yet — drag files here to upload</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onFolderClick(folder.id)}
          className="group flex flex-col items-center rounded-xl border border-border-muted bg-surface-default p-4 text-center transition-colors hover:border-border-default hover:bg-surface-hover"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-hover text-text-tertiary group-hover:text-accent">
            <FolderOpen className="h-7 w-7" />
          </div>
          <span className="mb-0.5 line-clamp-2 w-full break-words text-xs font-medium text-text-primary">
            {folder.name}
          </span>
          <span className="text-[10px] text-text-tertiary">Folder</span>
        </button>
      ))}
      {files.map((file) => (
        <div
          key={file.id}
          className="group flex flex-col items-center rounded-xl border border-border-muted bg-surface-default p-4 text-center transition-colors hover:border-border-default hover:bg-surface-hover"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-hover text-2xl">
            {getFileIcon(file.mimeType)}
          </div>
          <span className="mb-0.5 line-clamp-2 w-full break-words text-xs font-medium text-text-primary">
            {file.originalName}
          </span>
          <span className="text-[10px] text-text-tertiary">
            {formatSize(file.sizeBytes)} &middot; {formatDate(file.updatedAt)}
          </span>
        </div>
      ))}
    </div>
  )
}
