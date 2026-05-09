import { Folder, MoreVertical, FolderOpen } from "lucide-react"
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

interface FileListProps {
  folders: FolderType[]
  files: FileObject[]
  isLoading: boolean
  onFolderClick: (folderId: string) => void
}

export function FileList({ folders, files, isLoading, onFolderClick }: FileListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          >
            <div className="h-5 w-5 animate-pulse rounded bg-surface-hover" />
            <div className="h-4 flex-1 animate-pulse rounded bg-surface-hover" />
            <div className="h-4 w-16 animate-pulse rounded bg-surface-hover" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
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
    <div className="overflow-hidden rounded-xl border border-border-default">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-muted bg-surface-default">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-text-tertiary">
              Name
            </th>
            <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-tertiary md:table-cell">
              Size
            </th>
            <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-tertiary sm:table-cell">
              Modified
            </th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {folders.map((folder) => (
            <tr
              key={folder.id}
              className="cursor-pointer border-b border-border-muted transition-colors last:border-b-0 hover:bg-surface-hover"
              onClick={() => onFolderClick(folder.id)}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-text-tertiary" />
                  <span className="truncate text-sm font-medium text-text-primary">{folder.name}</span>
                </div>
              </td>
              <td className="hidden px-4 py-2.5 text-sm text-text-tertiary md:table-cell">
                —
              </td>
              <td className="hidden px-4 py-2.5 text-sm text-text-tertiary sm:table-cell">
                {formatDate(folder.updatedAt)}
              </td>
              <td className="px-4 py-2.5">
                <button
                  className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-default hover:text-text-primary"
                  aria-label="More options"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {files.map((file) => (
            <tr
              key={file.id}
              className="border-b border-border-muted transition-colors last:border-b-0 hover:bg-surface-hover"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                  <span className="truncate text-sm text-text-primary">{file.originalName}</span>
                </div>
              </td>
              <td className="hidden px-4 py-2.5 text-sm text-text-tertiary md:table-cell">
                {formatSize(file.sizeBytes)}
              </td>
              <td className="hidden px-4 py-2.5 text-sm text-text-tertiary sm:table-cell">
                {formatDate(file.updatedAt)}
              </td>
              <td className="px-4 py-2.5">
                <button
                  className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-default hover:text-text-primary"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
