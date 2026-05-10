/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import * as Dialog from "@radix-ui/react-dialog"
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { FileObject } from "@bucketdrive/shared"
import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateFileTags,
  useUpdateTag,
} from "@/lib/api"
import { TAG_COLOR_OPTIONS, getTagColorClasses } from "@/lib/tag-colors"

interface TagPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string | null
  file: FileObject | null
  canManageTags: boolean
}

export function TagPickerDialog({
  open,
  onOpenChange,
  workspaceId,
  file,
  canManageTags,
}: TagPickerDialogProps) {
  const tagsQuery = useTags(workspaceId)
  const createTag = useCreateTag(workspaceId)
  const updateTag = useUpdateTag(workspaceId)
  const deleteTag = useDeleteTag(workspaceId)
  const updateFileTags = useUpdateFileTags(workspaceId)

  const [search, setSearch] = useState("")
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLOR_OPTIONS[0]?.value ?? "#ef4444")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingColor, setEditingColor] = useState(TAG_COLOR_OPTIONS[0]?.value ?? "#ef4444")

  useEffect(() => {
    if (open) {
      setSelectedTagIds(file?.tags?.map((tag) => tag.id) ?? [])
    }
  }, [file, open])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setNewTagName("")
      setEditingTagId(null)
    }
  }, [open])

  const tags = tagsQuery.data?.data ?? []
  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((tag) => tag.name.toLowerCase().includes(q))
  }, [search, tags])

  const busy =
    createTag.isPending ||
    updateTag.isPending ||
    deleteTag.isPending ||
    updateFileTags.isPending

  const syncFileTags = async (tagIds: string[]) => {
    if (!file) return

    setSelectedTagIds(tagIds)
    await updateFileTags.mutateAsync({
      fileId: file.id,
      tagIds,
    })
  }

  const handleToggleTag = (tagId: string) => {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]

    void syncFileTags(next)
  }

  const handleCreateTag = async () => {
    const name = newTagName.trim()
    if (!name) return

    const created = await createTag.mutateAsync({
      name,
      color: newTagColor,
    })

    setNewTagName("")
    if (file) {
      await syncFileTags(Array.from(new Set([...selectedTagIds, created.id])))
    }
  }

  const handleStartEditing = (tagId: string, name: string, color: string) => {
    setEditingTagId(tagId)
    setEditingName(name)
    setEditingColor(color)
  }

  const handleSaveEditing = async () => {
    if (!editingTagId) return

    await updateTag.mutateAsync({
      tagId: editingTagId,
      name: editingName.trim() || undefined,
      color: editingColor,
    })

    setEditingTagId(null)
    setEditingName("")
  }

  const handleDeleteTag = async (tagId: string) => {
    await deleteTag.mutateAsync({ tagId })
    if (selectedTagIds.includes(tagId)) {
      await syncFileTags(selectedTagIds.filter((id) => id !== tagId))
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-default bg-surface-default shadow-2xl">
          <div className="flex items-start justify-between border-b border-border-muted px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Tags
              </Dialog.Title>
              <Dialog.Description className="text-sm text-text-tertiary">
                {file ? `Manage tags for ${file.originalName}` : "Manage workspace tags"}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Find tags
                </span>
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                  }}
                  placeholder="Search tags"
                  className="w-full rounded-xl border border-border-default bg-surface-secondary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                />
              </label>

              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
                {filteredTags.map((tag) => {
                  const colorClasses = getTagColorClasses(tag.color)
                  const editing = editingTagId === tag.id

                  return (
                    <div
                      key={tag.id}
                      className="rounded-xl border border-border-muted bg-surface-secondary p-3"
                    >
                      {editing ? (
                        <div className="space-y-3">
                          <input
                            value={editingName}
                            onChange={(event) => {
                              setEditingName(event.target.value)
                            }}
                            className="w-full rounded-lg border border-border-default bg-surface-default px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                          />
                          <ColorPicker value={editingColor} onChange={setEditingColor} />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                void handleSaveEditing()
                              }}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingTagId(null)
                              }}
                              className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {file ? (
                            <input
                              type="checkbox"
                              checked={selectedTagIds.includes(tag.id)}
                              onChange={() => {
                                handleToggleTag(tag.id)
                              }}
                              disabled={busy}
                              className="h-4 w-4 rounded border-border-default bg-surface-default text-accent"
                            />
                          ) : (
                            <span
                              className={[
                                "h-3 w-3 rounded-full",
                                colorClasses.swatchClassName,
                              ].join(" ")}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  colorClasses.chipClassName,
                                ].join(" ")}
                              >
                                {tag.name}
                              </span>
                            </div>
                          </div>
                          {canManageTags && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  handleStartEditing(tag.id, tag.name, tag.color)
                                }}
                                className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  void handleDeleteTag(tag.id)
                                }}
                                disabled={busy}
                                className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {filteredTags.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border-default px-4 py-10 text-center">
                    <Tag className="mx-auto h-8 w-8 text-text-tertiary" />
                    <p className="mt-2 text-sm text-text-tertiary">No matching tags</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border-muted bg-surface-secondary p-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Create a new tag</h3>
                <p className="mt-1 text-xs text-text-tertiary">
                  Pick a name and palette color to organize files.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Tag name
                </span>
                <input
                  value={newTagName}
                  onChange={(event) => {
                    setNewTagName(event.target.value)
                  }}
                  placeholder="Important"
                  className="w-full rounded-xl border border-border-default bg-surface-default px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Tag color
                </span>
                <ColorPicker value={newTagColor} onChange={setNewTagColor} />
              </div>

              <button
                onClick={() => {
                  void handleCreateTag()
                }}
                disabled={busy || !canManageTags}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create tag
              </button>

              {!canManageTags && (
                <p className="text-xs text-text-tertiary">
                  You can apply existing tags here, but creating or editing tags requires file-tag permissions.
                </p>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TAG_COLOR_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => {
            onChange(option.value)
          }}
          className={`rounded-xl border px-3 py-2 text-left transition-colors ${
            value === option.value
              ? "border-accent bg-accent/10"
              : "border-border-default bg-surface-default hover:bg-surface-hover"
          }`}
        >
          <span
            className={[
              "mb-2 block h-4 w-4 rounded-full",
              option.swatchClassName,
            ].join(" ")}
          />
          <span className="text-xs font-medium text-text-primary">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
