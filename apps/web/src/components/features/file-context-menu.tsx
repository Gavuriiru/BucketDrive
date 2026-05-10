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
} from "lucide-react"

interface FileContextMenuProps {
  itemId: string
  itemType: "file" | "folder"
  children: React.ReactNode
  onOpen?: () => void
  onDownload?: () => void
  onRename?: () => void
  onDelete?: () => void
  onShare?: () => void
  onFavorite?: () => void
  onCopy?: () => void
  onMove?: () => void
}

const menuItemClass =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-primary outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-active data-[highlighted]:text-text-primary data-[disabled]:text-text-tertiary"
const separatorClass = "mx-2 my-1 h-px bg-border-muted"

export function FileContextMenu({
  itemId: _itemId,
  itemType,
  children,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onShare,
  onFavorite,
  onCopy,
  onMove,
}: FileContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[180px] overflow-hidden rounded-lg border border-border-default bg-surface-default p-1.5 shadow-lg"> 
          <ContextMenu.Item
            className={menuItemClass}
            onClick={() => {
              onOpen?.()
            }}
          >
            <FolderOpen className="h-4 w-4 text-text-tertiary" />
            Open
            <span className="ml-auto text-xs text-text-tertiary">Enter</span>
          </ContextMenu.Item>

          {itemType === "file" && onDownload && (
            <ContextMenu.Item
              className={menuItemClass}
              onClick={() => {
                onDownload()
              }}
            >
              <Download className="h-4 w-4 text-text-tertiary" />
              Download
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className={separatorClass} />

          {itemType === "file" && onFavorite && (
            <>
              <ContextMenu.Item
                className={menuItemClass}
                onClick={() => {
                  onFavorite()
                }}
              >
                <Star className="h-4 w-4 text-text-tertiary" />
                Favorite
              </ContextMenu.Item>
              <ContextMenu.Separator className={separatorClass} />
            </>
          )}

          <ContextMenu.Item
            className={menuItemClass}
            onClick={() => {
              onRename?.()
            }}
          >
            <Pencil className="h-4 w-4 text-text-tertiary" />
            Rename
            <span className="ml-auto text-xs text-text-tertiary">F2</span>
          </ContextMenu.Item>

          <ContextMenu.Item
            className={menuItemClass}
            onClick={() => {
              onCopy?.()
            }}
          >
            <Copy className="h-4 w-4 text-text-tertiary" />
            Copy
            <span className="ml-auto text-xs text-text-tertiary">Ctrl+C</span>
          </ContextMenu.Item>

          {onMove && (
            <ContextMenu.Item
              className={menuItemClass}
              onClick={() => {
                onMove()
              }}
            >
              <ArrowRightLeft className="h-4 w-4 text-text-tertiary" />
              Move
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className={separatorClass} />

          {onShare && (
            <ContextMenu.Item
              className={menuItemClass}
              onClick={() => {
                onShare()
              }}
            >
              <Share2 className="h-4 w-4 text-text-tertiary" />
              Share
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Item
            className={menuItemClass}
            onClick={() => {
              onDelete?.()
            }}
          >
            <Trash2 className="h-4 w-4 text-text-tertiary" />
            Delete
            <span className="ml-auto text-xs text-text-tertiary">Del</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
