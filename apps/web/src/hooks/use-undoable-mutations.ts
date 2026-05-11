/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions */
import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useMoveFile,
  useRenameFile,
  useDeleteFile,
  useRestoreFile,
  useUpdateFolder,
  useDeleteFolder,
  useRestoreFolder,
} from "@/lib/api"
import { useUndoStore } from "@/stores/undo-store"
import { toast, dismissToast } from "@/hooks/use-toast"

export function useUndoableMutations(workspaceId: string | null) {
  const queryClient = useQueryClient()
  const undoStack = useUndoStore()

  const moveFileMutation = useMoveFile(workspaceId)
  const renameFileMutation = useRenameFile(workspaceId)
  const deleteFileMutation = useDeleteFile(workspaceId)
  const restoreFileMutation = useRestoreFile(workspaceId)

  const updateFolderMutation = useUpdateFolder(workspaceId)
  const deleteFolderMutation = useDeleteFolder(workspaceId)
  const restoreFolderMutation = useRestoreFolder(workspaceId)

  const invalidateExplorer = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] })
  }, [queryClient, workspaceId])

  const showUndoToast = useCallback(
    (description: string, onUndo: () => void) => {
      const id = toast({
        title: "Action performed",
        description,
        variant: "default",
        action: {
          label: "Undo",
          onClick: () => {
            onUndo()
            dismissToast(id)
          },
        },
        duration: 8000,
      })
    },
    [],
  )

  const moveFile = useCallback(
    async (fileId: string, folderId: string | null, originalFolderId: string | null) => {
      await moveFileMutation.mutateAsync({ fileId, folderId })
      undoStack.push({
        type: "file.move",
        description: "Moved file",
        payload: { fileId, originalFolderId },
      })
      showUndoToast("File moved.", async () => {
        await moveFileMutation.mutateAsync({ fileId, folderId: originalFolderId })
        invalidateExplorer()
      })
    },
    [moveFileMutation, undoStack, showUndoToast, invalidateExplorer],
  )

  const renameFile = useCallback(
    async (fileId: string, name: string, originalName: string) => {
      await renameFileMutation.mutateAsync({ fileId, name })
      undoStack.push({
        type: "file.rename",
        description: "Renamed file",
        payload: { fileId, originalName },
      })
      showUndoToast("File renamed.", async () => {
        await renameFileMutation.mutateAsync({ fileId, name: originalName })
        invalidateExplorer()
      })
    },
    [renameFileMutation, undoStack, showUndoToast, invalidateExplorer],
  )

  const deleteFile = useCallback(
    async (fileId: string) => {
      await deleteFileMutation.mutateAsync({ fileId })
      undoStack.push({
        type: "file.delete",
        description: "Deleted file",
        payload: { fileId },
      })
      showUndoToast("File moved to trash.", async () => {
        await restoreFileMutation.mutateAsync({ fileId })
        invalidateExplorer()
      })
    },
    [deleteFileMutation, restoreFileMutation, undoStack, showUndoToast, invalidateExplorer],
  )

  const moveFolder = useCallback(
    async (folderId: string, parentFolderId: string | null, originalParentFolderId: string | null) => {
      await updateFolderMutation.mutateAsync({ folderId, parentFolderId })
      undoStack.push({
        type: "folder.move",
        description: "Moved folder",
        payload: { folderId, originalParentFolderId },
      })
      showUndoToast("Folder moved.", async () => {
        await updateFolderMutation.mutateAsync({
          folderId,
          parentFolderId: originalParentFolderId,
        })
        invalidateExplorer()
      })
    },
    [updateFolderMutation, undoStack, showUndoToast, invalidateExplorer],
  )

  const renameFolder = useCallback(
    async (folderId: string, name: string, originalName: string) => {
      await updateFolderMutation.mutateAsync({ folderId, name })
      undoStack.push({
        type: "folder.rename",
        description: "Renamed folder",
        payload: { folderId, originalName },
      })
      showUndoToast("Folder renamed.", async () => {
        await updateFolderMutation.mutateAsync({ folderId, name: originalName })
        invalidateExplorer()
      })
    },
    [updateFolderMutation, undoStack, showUndoToast, invalidateExplorer],
  )

  const deleteFolder = useCallback(
    async (folderId: string) => {
      await deleteFolderMutation.mutateAsync({ folderId })
      undoStack.push({
        type: "folder.delete",
        description: "Deleted folder",
        payload: { folderId },
      })
      showUndoToast("Folder moved to trash.", async () => {
        await restoreFolderMutation.mutateAsync({ folderId })
        invalidateExplorer()
      })
    },
    [deleteFolderMutation, restoreFolderMutation, undoStack, showUndoToast, invalidateExplorer],
  )

  const undo = useCallback(async () => {
    const action = undoStack.pop()
    if (!action) return

    try {
      switch (action.type) {
        case "file.move": {
          const { fileId, originalFolderId } = action.payload as {
            fileId: string
            originalFolderId: string | null
          }
          await moveFileMutation.mutateAsync({ fileId, folderId: originalFolderId })
          break
        }
        case "file.rename": {
          const { fileId, originalName } = action.payload as {
            fileId: string
            originalName: string
          }
          await renameFileMutation.mutateAsync({ fileId, name: originalName })
          break
        }
        case "file.delete": {
          const { fileId } = action.payload as { fileId: string }
          await restoreFileMutation.mutateAsync({ fileId })
          break
        }
        case "folder.move": {
          const { folderId, originalParentFolderId } = action.payload as {
            folderId: string
            originalParentFolderId: string | null
          }
          await updateFolderMutation.mutateAsync({
            folderId,
            parentFolderId: originalParentFolderId,
          })
          break
        }
        case "folder.rename": {
          const { folderId, originalName } = action.payload as {
            folderId: string
            originalName: string
          }
          await updateFolderMutation.mutateAsync({ folderId, name: originalName })
          break
        }
        case "folder.delete": {
          const { folderId } = action.payload as { folderId: string }
          await restoreFolderMutation.mutateAsync({ folderId })
          break
        }
      }
      invalidateExplorer()
      toast({
        title: "Undone",
        description: `${action.description} has been reverted.`,
        variant: "success",
        duration: 3000,
      })
    } catch {
      toast({
        title: "Undo failed",
        description: "Could not revert the last action. Please try again.",
        variant: "error",
        duration: 5000,
      })
    }
  }, [
    undoStack,
    moveFileMutation,
    renameFileMutation,
    restoreFileMutation,
    updateFolderMutation,
    invalidateExplorer,
  ])

  return {
    moveFile,
    renameFile,
    deleteFile,
    moveFolder,
    renameFolder,
    deleteFolder,
    undo,
    canUndo: undoStack.canUndo,
  }
}
