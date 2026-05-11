/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { useEffect, useRef } from "react"
import {
  X,
  ChevronUp,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Pause,
  Play,
} from "lucide-react"
import { useUploadStore } from "@/stores/upload-store"
import { useUploadProcessor } from "@/hooks/use-upload"
import { ProgressBar } from "@/components/shared/progress-bar"
import type { UploadItem } from "@/stores/upload-store"

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const unit = units[i] ?? "GB"
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${unit}`
}

export function UploadQueue({ workspaceId }: { workspaceId: string }) {
  const { items, isOpen, setOpen, removeItem, clearCompleted } = useUploadStore()
  const { processQueue, cancelItem, pauseItem, resumeItem } = useUploadProcessor(workspaceId)
  const processingRef = useRef(false)

  const queuedCount = items.filter((i) => i.status === "queued" || i.status === "uploading").length
  const failedCount = items.filter((i) => i.status === "failed").length
  const pausedCount = items.filter((i) => i.status === "paused").length
  const hasItems = items.length > 0

  useEffect(() => {
    const queued = items.filter((i) => i.status === "queued")
    if (queued.length > 0 && !processingRef.current) {
      processingRef.current = true
      processQueue().finally(() => {
        processingRef.current = false
      })
    }
  }, [items, processQueue])

  if (!isOpen && !hasItems) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border-default bg-bg-primary shadow-lg">
      <div className="flex items-center justify-between border-b border-border-muted px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">Uploads</span>
          {queuedCount > 0 && (
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
              {queuedCount}
            </span>
          )}
          {failedCount > 0 && (
            <span className="rounded-full bg-error/10 px-1.5 py-0.5 text-xs font-medium text-error">
              {failedCount} failed
            </span>
          )}
          {pausedCount > 0 && (
            <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning">
              {pausedCount} paused
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearCompleted}
            className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Clear completed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {items.map((item) => (
          <UploadQueueItem
            key={item.id}
            item={item}
            onCancel={() => cancelItem(item)}
            onPause={() => pauseItem(item)}
            onResume={() => resumeItem(item)}
            onRetry={() => resumeItem(item)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      {!isOpen && hasItems && (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 border-t border-border-muted px-4 py-2 text-xs text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          {queuedCount > 0
            ? `${String(queuedCount)} uploading`
            : failedCount > 0
              ? `${String(failedCount)} failed`
              : pausedCount > 0
                ? `${String(pausedCount)} paused`
                : "All complete"}
          <ChevronUp className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function UploadQueueItem({
  item,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onRemove,
}: {
  item: UploadItem
  onCancel: () => void
  onPause: () => void
  onResume: () => void
  onRetry: () => void
  onRemove: () => void
}) {
  const doneChunks = item.chunks.filter((c) => c.status === "done").length
  const totalChunks = item.totalChunks ?? 0
  const showChunkProgress = totalChunks > 1 && item.status === "uploading"

  return (
    <div className="border-b border-border-muted px-4 py-2.5 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {item.status === "uploading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          ) : item.status === "completed" ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : item.status === "failed" ? (
            <AlertCircle className="h-5 w-5 text-error" />
          ) : item.status === "paused" ? (
            <Pause className="h-5 w-5 text-warning" />
          ) : (
            <File className="h-5 w-5 text-text-tertiary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm text-text-primary">{item.fileName}</p>
            <span className="shrink-0 text-xs text-text-tertiary">
              {formatSize(item.fileSize)}
            </span>
          </div>

          {(item.status === "uploading" || item.status === "queued" || item.status === "paused") && (
            <ProgressBar value={item.progress} className="mt-1.5" />
          )}

          {showChunkProgress && (
            <p className="mt-0.5 text-xs text-text-tertiary">
              Part {doneChunks}/{totalChunks} · {Math.round(item.progress)}%
            </p>
          )}

          {!showChunkProgress && item.status === "uploading" && (
            <p className="mt-0.5 text-xs text-text-tertiary">{Math.round(item.progress)}%</p>
          )}

          {item.status === "completed" && (
            <p className="mt-0.5 text-xs text-success">Uploaded</p>
          )}

          {item.status === "failed" && (
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-xs text-error">{item.error ?? "Failed"}</p>
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-xs text-accent underline transition-colors hover:text-text-primary"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
              <button
                onClick={onRemove}
                className="text-xs text-text-tertiary underline transition-colors hover:text-text-primary"
              >
                Dismiss
              </button>
            </div>
          )}

          {item.status === "paused" && (
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-xs text-warning">Paused</p>
              <button
                onClick={onResume}
                className="flex items-center gap-1 text-xs text-accent underline transition-colors hover:text-text-primary"
              >
                <Play className="h-3 w-3" />
                Resume
              </button>
              <button
                onClick={onCancel}
                className="text-xs text-text-tertiary underline transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          )}

          {item.status === "queued" && (
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-xs text-text-tertiary">Waiting</p>
              <button
                onClick={onCancel}
                className="text-xs text-text-tertiary underline transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          )}

          {item.status === "uploading" && (
            <div className="mt-0.5 flex items-center gap-2">
              <button
                onClick={onPause}
                className="flex items-center gap-1 text-xs text-text-tertiary underline transition-colors hover:text-text-primary"
              >
                <Pause className="h-3 w-3" />
                Pause
              </button>
              <button
                onClick={onCancel}
                className="text-xs text-text-tertiary underline transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
