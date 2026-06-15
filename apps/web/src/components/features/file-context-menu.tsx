import * as ContextMenu from "@radix-ui/react-context-menu"
import {
  FolderOpen,
  Download,
  Pencil,
  Trash2,
  Share2,
  Copy,
  ArrowRightLeft,
  Star,
  Tags,
  Eye,
} from "lucide-react"

interface FileContextMenuProps {
  itemId: string
  itemType: "file" | "folder"
  scope?: "item" | "selection"
  children: React.ReactNode
  downloadLabel?: string
  copyLabel?: string
  moveLabel?: string
  shareLabel?: string
  deleteLabel?: string
  tagsLabel?: string
  onOpen?: () => void
  onPreview?: () => void
  onDownload?: () => void
  onRename?: () => void
  onDelete?: () => void
  onShare?: () => void
  onFavorite?: () => void
  favoriteLabel?: string
  onTags?: () => void
  onCopy?: () => void
  onMove?: () => void
}

const menuItemClass =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-primary outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-active data-[highlighted]:text-text-primary data-[disabled]:text-text-tertiary"
const separatorClass = "mx-2 my-1 h-px bg-border-muted"

export function FileContextMenu({
  itemId: _itemId,
  itemType,
  scope = "item",
  children,
  downloadLabel = "Download",
  copyLabel = "Copy",
  moveLabel = "Move",
  shareLabel = "Share",
  deleteLabel = "Delete",
  tagsLabel = "Tags",
  onOpen,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onShare,
  onFavorite,
  favoriteLabel = "Favorite",
  onTags,
  onCopy,
  onMove,
}: FileContextMenuProps) {
  const supportsFileActions = itemType === "file" || scope === "selection"

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          data-selection-ignore
          className="border-border-default bg-surface-default z-50 min-w-[180px] overflow-hidden rounded-lg border p-1.5 shadow-lg"
        >
          {onOpen && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onOpen()
              }}
            >
              <FolderOpen className="text-text-tertiary h-4 w-4" />
              Open
              <span className="text-text-tertiary ml-auto text-xs">Enter</span>
            </ContextMenu.Item>
          )}

          {itemType === "file" && scope === "item" && onPreview && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onPreview()
              }}
            >
              <Eye className="text-text-tertiary h-4 w-4" />
              Preview
              <span className="text-text-tertiary ml-auto text-xs">Space</span>
            </ContextMenu.Item>
          )}

          {supportsFileActions && onDownload && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onDownload()
              }}
            >
              <Download className="text-text-tertiary h-4 w-4" />
              {downloadLabel}
            </ContextMenu.Item>
          )}

          {supportsFileActions && (onPreview || onDownload) && (
            <ContextMenu.Separator className={separatorClass} />
          )}

          {supportsFileActions && onFavorite && (
            <>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => {
                  onFavorite()
                }}
              >
                <Star className="text-text-tertiary h-4 w-4" />
                {favoriteLabel}
              </ContextMenu.Item>
              {onTags && (
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => {
                    onTags()
                  }}
                >
                  <Tags className="text-text-tertiary h-4 w-4" />
                  {tagsLabel}
                </ContextMenu.Item>
              )}
              <ContextMenu.Separator className={separatorClass} />
            </>
          )}

          {onRename && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onRename()
              }}
            >
              <Pencil className="text-text-tertiary h-4 w-4" />
              Rename
              <span className="text-text-tertiary ml-auto text-xs">F2</span>
            </ContextMenu.Item>
          )}

          {onCopy && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onCopy()
              }}
            >
              <Copy className="text-text-tertiary h-4 w-4" />
              {copyLabel}
              <span className="text-text-tertiary ml-auto text-xs">Ctrl+C</span>
            </ContextMenu.Item>
          )}

          {onMove && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onMove()
              }}
            >
              <ArrowRightLeft className="text-text-tertiary h-4 w-4" />
              {moveLabel}
            </ContextMenu.Item>
          )}

          {(onRename || onCopy || onMove) && <ContextMenu.Separator className={separatorClass} />}

          {onShare && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onShare()
              }}
            >
              <Share2 className="text-text-tertiary h-4 w-4" />
              {shareLabel}
            </ContextMenu.Item>
          )}

          {onShare && <ContextMenu.Separator className={separatorClass} />}

          {onDelete && (
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => {
                onDelete()
              }}
            >
              <Trash2 className="text-text-tertiary h-4 w-4" />
              {deleteLabel}
              <span className="text-text-tertiary ml-auto text-xs">Del</span>
            </ContextMenu.Item>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
