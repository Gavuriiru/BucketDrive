/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions */
import { useCallback } from "react"
import { useUploadStore } from "@/stores/upload-store"
import { useInitiateUpload, useCompleteUpload } from "@/lib/api"
import type { UploadItem } from "@/stores/upload-store"

export function useUploadProcessor(workspaceId: string) {
  const { items, updateItem, setOpen } = useUploadStore()
  const initiateMutation = useInitiateUpload()
  const completeMutation = useCompleteUpload()

  const processItem = useCallback(
    async (item: UploadItem) => {
      updateItem(item.id, { status: "uploading", progress: 0 })

      try {
        const initiate = await initiateMutation.mutateAsync({
          workspaceId,
          fileName: item.fileName,
          mimeType: item.mimeType,
          sizeBytes: item.fileSize,
        })

        updateItem(item.id, {
          uploadId: initiate.uploadId,
          storageKey: initiate.storageKey,
          progress: 10,
        })

        await uploadWithProgress(item.file, initiate.signedUrl, (progress) => {
          updateItem(item.id, { progress: 10 + progress * 0.7 })
        })

        updateItem(item.id, { progress: 85 })

        await completeMutation.mutateAsync({
          workspaceId,
          uploadId: initiate.uploadId,
          fileName: item.fileName,
          mimeType: item.mimeType,
        })

        updateItem(item.id, { status: "completed", progress: 100 })
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        updateItem(item.id, { status: "failed", error: message })
        return false
      }
    },
    [workspaceId, updateItem, initiateMutation, completeMutation],
  )

  const processQueue = useCallback(async () => {
    const queued = items.filter((i) => i.status === "queued")
    for (const item of queued) {
      await processItem(item)
    }
    const remaining = useUploadStore.getState().items.filter(
      (i) => i.status !== "completed" && i.status !== "failed",
    )
    if (remaining.length === 0) {
      setTimeout(() => setOpen(false), 5000)
    }
  }, [items, processItem, setOpen])

  return { processQueue }
}

function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Upload failed")))
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))

    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.send(file)
  })
}
