import { Folder, FolderOpen, MoreVertical } from "lucide-react"
import type { FileObject, Folder as FolderType } from "@bucketdrive/shared"
import { FileContextMenu } from "./file-context-menu"
import { useExplorerStore } from "@/stores/explorer-store"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

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

const dropdownItemClass =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-primary outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-active data-[highlighted]:text-text-primary data-[disabled]:text-text-tertiary"

interface FileListProps {
  folders: FolderType[]
  files: FileObject[]
  isLoading: boolean
  onFolderClick: (folderId: string) => void
  onItemClick: (id: string, type: "file" | "folder", index: number, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onContextOpen?: (id: string, type: "file" | "folder") => void
  onContextDownload?: (id: string) => void
  onContextRename?: (id: string, type: "file" | "folder") => void
  onContextDelete?: (id: string, type: "file" | "folder") => void
  onContextFavorite?: (id: string) => void
}

export function FileList({
  folders,
  files,
  isLoading,
  onFolderClick,
  onItemClick,
  onContextOpen,
  onContextDownload,
  onContextRename,
  onContextDelete,
  onContextFavorite,
}: FileListProps) {
  const selectedFileIds = useExplorerStore((s) => s.selectedFileIds)
  const selectedFolderIds = useExplorerStore((s) => s.selectedFolderIds)
  const focusedItemId = useExplorerStore((s) => s.focusedItemId)

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
          {folders.map((folder, index) => {
            const isSelected = selectedFolderIds.includes(folder.id)
            const isFocused = focusedItemId === folder.id
            return (
              <FileContextMenu
                key={folder.id}
                itemId={folder.id}
                itemType="folder"
                onOpen={() => onFolderClick(folder.id)}
                onRename={() => onContextRename?.(folder.id, "folder")}
                onDelete={() => onContextDelete?.(folder.id, "folder")}
                onCopy={() => {
                  useExplorerStore.getState().setClipboard({
                    action: "copy",
                    fileIds: [],
                    folderIds: [folder.id],
                  })
                }}
              >
                <tr
                  role="button"
                  tabIndex={0}
                  data-item-id={folder.id}
                  data-item-type="folder"
                  data-item-index={index}
                  onClick={(e) => onItemClick(folder.id, "folder", index, e)}
                  onDoubleClick={() => onFolderClick(folder.id)}
                  className={`cursor-pointer border-b border-border-muted transition-colors last:border-b-0 hover:bg-surface-hover focus:outline-none ${
                    isSelected ? "bg-accent/10" : ""
                  } ${isFocused && !isSelected ? "bg-surface-hover" : ""}`}
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
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-default hover:text-text-primary"
                          aria-label="More options"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-border-default bg-surface-default p-1.5 shadow-lg" side="bottom" align="end">
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onFolderClick(folder.id)}>
                            Open
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onContextRename?.(folder.id, "folder")}>
                            Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onContextDelete?.(folder.id, "folder")}>
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              </FileContextMenu>
            )
          })}
          {files.map((file, index) => {
            const globalIndex = folders.length + index
            const isSelected = selectedFileIds.includes(file.id)
            const isFocused = focusedItemId === file.id
            return (
              <FileContextMenu
                key={file.id}
                itemId={file.id}
                itemType="file"
                onOpen={() => onContextOpen?.(file.id, "file")}
                onDownload={() => onContextDownload?.(file.id)}
                onRename={() => onContextRename?.(file.id, "file")}
                onDelete={() => onContextDelete?.(file.id, "file")}
                onFavorite={() => onContextFavorite?.(file.id)}
                onCopy={() => {
                  useExplorerStore.getState().setClipboard({
                    action: "copy",
                    fileIds: [file.id],
                    folderIds: [],
                  })
                }}
              >
                <tr
                  role="button"
                  tabIndex={0}
                  data-item-id={file.id}
                  data-item-type="file"
                  data-item-index={globalIndex}
                  onClick={(e) => onItemClick(file.id, "file", globalIndex, e)}
                  className={`cursor-pointer border-b border-border-muted transition-colors last:border-b-0 hover:bg-surface-hover focus:outline-none ${
                    isSelected ? "bg-accent/10" : ""
                  } ${isFocused && !isSelected ? "bg-surface-hover" : ""}`}
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
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-default hover:text-text-primary"
                          aria-label="More options"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-border-default bg-surface-default p-1.5 shadow-lg" side="bottom" align="end">
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onContextOpen?.(file.id, "file")}>
                            Open
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onContextDownload?.(file.id)}>
                            Download
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onContextRename?.(file.id, "file")}>
                            Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onContextFavorite?.(file.id)}>
                            Favorite
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className={dropdownItemClass} onClick={() => onContextDelete?.(file.id, "file")}>
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              </FileContextMenu>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
