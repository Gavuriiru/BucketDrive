import { Folder, FolderOpen } from "lucide-react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import type { FileObject, Folder as FolderType } from "@bucketdrive/shared"
import { FileContextMenu } from "./file-context-menu"
import { useExplorerStore } from "@/stores/explorer-store"

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
  if (mimeType.startsWith("image/")) return "\uD83D\uDDBC"
  if (mimeType.startsWith("video/")) return "\uD83C\uDFAC"
  if (mimeType.startsWith("audio/")) return "\uD83C\uDFB5"
  if (mimeType.includes("pdf")) return "\uD83D\uDCC4"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "\uD83D\uDCCA"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "\uD83D\uDCBD"
  if (mimeType.startsWith("text/")) return "\uD83D\uDCDD"
  return "\uD83D\uDCC1"
}

const gridClass =
  "group flex cursor-pointer flex-col items-center rounded-xl border bg-surface-default p-4 text-center transition-colors hover:border-border-default hover:bg-surface-hover focus:outline-none"

interface FolderGridCardProps {
  folder: FolderType
  index: number
  isSelected: boolean
  isFocused: boolean
  onFolderClick: (folderId: string) => void
  onItemClick: (id: string, type: "file" | "folder", index: number, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onContextOpen?: (id: string, type: "file" | "folder") => void
  onContextRename?: (id: string, type: "file" | "folder") => void
  onContextDelete?: (id: string, type: "file" | "folder") => void
  onContextMove?: (id: string, type: "file" | "folder") => void
  dndEnabled: boolean
}

function FolderGridCard({
  folder,
  index,
  isSelected,
  isFocused,
  onFolderClick,
  onItemClick,
  onContextOpen,
  onContextRename,
  onContextDelete,
  onContextMove,
  dndEnabled,
}: FolderGridCardProps) {
  const dragId = `folder-${folder.id}`
  const droppable = useDroppable({ id: dragId, disabled: !dndEnabled })
  const draggable = useDraggable({ id: dragId, disabled: !dndEnabled })

  const setRefs = (node: HTMLDivElement | null) => {
    draggable.setNodeRef(node)
    droppable.setNodeRef(node)
  }

  const isDragging = draggable.isDragging
  const isOver = droppable.isOver

  return (
    <FileContextMenu
      key={folder.id}
      itemId={folder.id}
      itemType="folder"
      onOpen={() => onFolderClick(folder.id)}
      onRename={() => onContextRename?.(folder.id, "folder")}
      onDelete={() => onContextDelete?.(folder.id, "folder")}
      onMove={() => onContextMove?.(folder.id, "folder")}
      onCopy={() => {
        useExplorerStore.getState().setClipboard({
          action: "copy",
          fileIds: [],
          folderIds: [folder.id],
        })
      }}
    >
      <div
        ref={setRefs}
        data-item-id={folder.id}
        data-item-type="folder"
        data-item-index={index}
        onClick={(e) => {
          if (!dndEnabled || !isDragging) onItemClick(folder.id, "folder", index, e)
        }}
        onDoubleClick={() => onFolderClick(folder.id)}
        {...draggable.attributes}
        {...draggable.listeners}
        className={`${gridClass} ${
          isDragging
            ? "opacity-50"
            : isOver
              ? "border-accent bg-accent/10"
              : isSelected
                ? "border-accent bg-accent/10 ring-1 ring-accent"
                : isFocused
                  ? "border-border-default ring-1 ring-border-muted"
                  : "border-border-muted"
        }`}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-hover text-text-tertiary group-hover:text-accent">
          <FolderOpen className="h-7 w-7" />
        </div>
        <span className="mb-0.5 line-clamp-2 w-full break-words text-xs font-medium text-text-primary">
          {folder.name}
        </span>
        <span className="text-[10px] text-text-tertiary">Folder</span>
      </div>
    </FileContextMenu>
  )
}

interface FileGridCardProps {
  file: FileObject
  index: number
  isSelected: boolean
  isFocused: boolean
  onItemClick: (id: string, type: "file" | "folder", index: number, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onContextOpen?: (id: string, type: "file" | "folder") => void
  onContextDownload?: (id: string) => void
  onContextRename?: (id: string, type: "file" | "folder") => void
  onContextDelete?: (id: string, type: "file" | "folder") => void
  onContextFavorite?: (id: string) => void
  onContextMove?: (id: string, type: "file" | "folder") => void
  dndEnabled: boolean
}

function FileGridCard({
  file,
  index,
  isSelected,
  isFocused,
  onItemClick,
  onContextOpen,
  onContextDownload,
  onContextRename,
  onContextDelete,
  onContextFavorite,
  onContextMove,
  dndEnabled,
}: FileGridCardProps) {
  const dragId = `file-${file.id}`
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: dragId,
    disabled: !dndEnabled,
  })

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
      onMove={() => onContextMove?.(file.id, "file")}
      onCopy={() => {
        useExplorerStore.getState().setClipboard({
          action: "copy",
          fileIds: [file.id],
          folderIds: [],
        })
      }}
    >
      <div
        ref={setNodeRef}
        data-item-id={file.id}
        data-item-type="file"
        data-item-index={index}
        onClick={(e) => {
          if (!dndEnabled || !isDragging) onItemClick(file.id, "file", index, e)
        }}
        {...attributes}
        {...listeners}
        className={`${gridClass} ${
          isDragging
            ? "opacity-50"
            : isSelected
              ? "border-accent bg-accent/10 ring-1 ring-accent"
              : isFocused
                ? "border-border-default ring-1 ring-border-muted"
                : "border-border-muted"
        }`}
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
    </FileContextMenu>
  )
}

interface FileGridProps {
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
  onContextMove?: (id: string, type: "file" | "folder") => void
  onItemDrop?: (sourceId: string, sourceType: "file" | "folder", targetFolderId: string) => void
}

export function FileGrid({
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
  onContextMove,
  onItemDrop,
}: FileGridProps) {
  const selectedFileIds = useExplorerStore((s) => s.selectedFileIds)
  const selectedFolderIds = useExplorerStore((s) => s.selectedFolderIds)
  const focusedItemId = useExplorerStore((s) => s.focusedItemId)
  const dndEnabled = !!onItemDrop

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
      {folders.map((folder, index) => (
        <FolderGridCard
          key={folder.id}
          folder={folder}
          index={index}
          isSelected={selectedFolderIds.includes(folder.id)}
          isFocused={focusedItemId === folder.id}
          onFolderClick={onFolderClick}
          onItemClick={onItemClick}
          onContextOpen={onContextOpen}
          onContextRename={onContextRename}
          onContextDelete={onContextDelete}
          onContextMove={onContextMove}
          dndEnabled={dndEnabled}
        />
      ))}
      {files.map((file, index) => {
        const globalIndex = folders.length + index
        return (
          <FileGridCard
            key={file.id}
            file={file}
            index={globalIndex}
            isSelected={selectedFileIds.includes(file.id)}
            isFocused={focusedItemId === file.id}
            onItemClick={onItemClick}
            onContextOpen={onContextOpen}
            onContextDownload={onContextDownload}
            onContextRename={onContextRename}
            onContextDelete={onContextDelete}
            onContextFavorite={onContextFavorite}
            onContextMove={onContextMove}
            dndEnabled={dndEnabled}
          />
        )
      })}
    </div>
  )
}
