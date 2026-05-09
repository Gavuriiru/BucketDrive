import * as Dialog from "@radix-ui/react-dialog"
import { X, Copy, Check, Share2 } from "lucide-react"
import { useState, useCallback } from "react"
import { useCreateShare } from "@/lib/api"

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  resourceId: string
  resourceType: "file" | "folder"
  resourceName: string
}

export function ShareModal({
  open,
  onOpenChange,
  workspaceId,
  resourceId,
  resourceType,
  resourceName,
}: ShareModalProps) {
  const createShare = useCreateShare(workspaceId)
  const [permissions, setPermissions] = useState<("read" | "download")[]>(["read", "download"])
  const [copied, setCopied] = useState(false)
  const [createdShareId, setCreatedShareId] = useState<string | null>(null)

  const handleCreate = useCallback(() => {
    createShare.mutate(
      {
        resourceId,
        resourceType,
        shareType: "internal",
        permissions,
      },
      {
        onSuccess: (data) => {
          setCreatedShareId(data.id)
        },
      },
    )
  }, [resourceId, resourceType, permissions, createShare])

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/shared/${createdShareId}`
    void navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [createdShareId])

  const togglePermission = (perm: "read" | "download") => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-surface-default p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              Share &ldquo;{resourceName}&rdquo;
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {!createdShareId ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-text-secondary mb-2">
                  Share this {resourceType} with workspace members
                </p>
                <div className="rounded-lg border border-border-muted bg-surface-secondary p-3">
                  <p className="text-xs font-medium text-text-secondary mb-2">Permissions</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePermission("read")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        permissions.includes("read")
                          ? "bg-accent text-white"
                          : "border border-border-muted bg-surface-default text-text-secondary hover:border-border-default"
                      }`}
                    >
                      Read
                    </button>
                    <button
                      onClick={() => togglePermission("download")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        permissions.includes("download")
                          ? "bg-accent text-white"
                          : "border border-border-muted bg-surface-default text-text-secondary hover:border-border-default"
                      }`}
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Dialog.Close className="rounded-lg border border-border-muted px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors">
                  Cancel
                </Dialog.Close>
                <button
                  onClick={handleCreate}
                  disabled={permissions.length === 0 || createShare.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  {createShare.isPending ? "Creating..." : "Create share"}
                </button>
              </div>

              {createShare.isError && (
                <p className="text-sm text-error">
                  {createShare.error instanceof Error
                    ? createShare.error.message
                    : "Failed to create share"}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg border border-border-muted bg-surface-secondary p-4">
                <p className="text-xs font-medium text-text-secondary mb-1">Share link created</p>
                <p className="text-sm text-text-primary">
                  Workspace members can now access this {resourceType}.
                </p>
              </div>

              <button
                onClick={handleCopyLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-surface-default px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-text-tertiary" />
                    Copy share link
                  </>
                )}
              </button>

              <div className="flex justify-end">
                <Dialog.Close className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90">
                  Done
                </Dialog.Close>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
