/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-confusing-void-expression */
import { useEffect, useMemo, useState } from "react"
import { Command } from "cmdk"
import { File, Search, Loader2 } from "lucide-react"
import { useRouter } from "@tanstack/react-router"
import { useCommandPaletteStore } from "@/stores/command-palette-store"
import { useExplorerStore } from "@/stores/explorer-store"
import { useWorkspaces, useSearchFiles } from "@/lib/api"
import { getAllCommands, type Command as PaletteCommand } from "@/components/shared/commands"

function FileSearchFallback({
  query,
  workspaceId,
  onSelect,
}: {
  query: string
  workspaceId: string | null
  onSelect: (fileId: string, folderId: string | null) => void
}) {
  const { data, isLoading } = useSearchFiles(workspaceId, {
    q: query,
    limit: 3,
    enabled: query.length > 0,
  })

  if (isLoading) {
    return (
      <div className="text-text-secondary flex items-center gap-2 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Searching files...</span>
      </div>
    )
  }

  const files = data?.data ?? []

  if (files.length === 0) {
    return (
      <div className="text-text-secondary px-4 py-3 text-sm">
        No files found for &ldquo;{query}&rdquo;
      </div>
    )
  }

  return (
    <Command.Group heading="File Search Results">
      {files.map((file) => (
        <Command.Item
          key={`file-result-${file.id}`}
          value={`file-result-${file.id}-${file.originalName}`}
          onSelect={() => {
            onSelect(file.id, file.folderId)
          }}
          className="text-text-primary aria-selected:bg-accent/10 aria-selected:text-accent flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm"
        >
          <File className="text-text-tertiary h-4 w-4 shrink-0" />
          <span className="truncate">{file.originalName}</span>
        </Command.Item>
      ))}
    </Command.Group>
  )
}

export function CommandPalette() {
  const { isOpen, close, query, setQuery } = useCommandPaletteStore()
  const [commands, setCommands] = useState<PaletteCommand[]>([])
  const router = useRouter()
  const { data: workspacesData } = useWorkspaces()

  const workspace = workspacesData?.data[0]
  const workspaceId = workspace?.id ?? null
  const userRole = workspace?.role

  // Refresh commands when palette opens to evaluate conditions
  useEffect(() => {
    if (isOpen) {
      setCommands(getAllCommands((opts) => void router.navigate(opts), userRole))
    }
  }, [isOpen, userRole, router])

  // Reset query when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery("")
    }
  }, [isOpen, setQuery])

  const navigationCommands = useMemo(
    () => commands.filter((c) => c.category === "navigation"),
    [commands],
  )
  const fileCommands = useMemo(() => commands.filter((c) => c.category === "file"), [commands])
  const appearanceCommands = useMemo(
    () => commands.filter((c) => c.category === "appearance"),
    [commands],
  )

  const hasAnyCommands =
    navigationCommands.length > 0 || fileCommands.length > 0 || appearanceCommands.length > 0

  const handleFileSelect = (fileId: string, folderId: string | null) => {
    close()
    void router.navigate({
      to: "/dashboard/files",
      search: { folderId: folderId ?? undefined, previewFileId: undefined },
    })
    useExplorerStore.getState().setFocusedItem(fileId, "file")
  }

  const handleCommandSelect = (command: PaletteCommand) => {
    close()
    void command.action()
  }

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      label="Command palette"
      className="fixed inset-0 z-50"
    >
      <div
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      <div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[30%] left-1/2 z-50 w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2">
        <Command
          className="border-border-default bg-surface-default overflow-hidden rounded-xl border shadow-xl"
          loop
        >
          <div className="border-border-muted flex items-center gap-2 border-b px-4 py-3">
            <Search className="text-text-tertiary h-4 w-4 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search files..."
              className="text-text-primary placeholder:text-text-tertiary flex-1 bg-transparent text-sm outline-none"
            />
            <kbd className="border-border-default bg-bg-tertiary text-text-tertiary rounded-md border px-1.5 py-0.5 text-xs">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto py-2">
            {!hasAnyCommands && query.length === 0 && (
              <div className="text-text-secondary px-4 py-3 text-sm">No commands available</div>
            )}

            {navigationCommands.length > 0 && (
              <Command.Group
                heading="Navigation"
                className="text-text-tertiary px-2 text-xs font-medium"
              >
                {navigationCommands.map((command) => (
                  <Command.Item
                    key={command.id}
                    value={`${command.id} ${command.title} ${command.keywords?.join(" ") ?? ""}`}
                    onSelect={() => handleCommandSelect(command)}
                    className="text-text-primary aria-selected:bg-accent/10 aria-selected:text-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm"
                  >
                    {command.icon && (
                      <command.icon className="text-text-tertiary h-4 w-4 shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span>{command.title}</span>
                      {command.subtitle && (
                        <span className="text-text-tertiary text-xs">{command.subtitle}</span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {fileCommands.length > 0 && (
              <Command.Group
                heading="File Operations"
                className="text-text-tertiary px-2 text-xs font-medium"
              >
                {fileCommands.map((command) => (
                  <Command.Item
                    key={command.id}
                    value={`${command.id} ${command.title} ${command.keywords?.join(" ") ?? ""}`}
                    onSelect={() => handleCommandSelect(command)}
                    className="text-text-primary aria-selected:bg-accent/10 aria-selected:text-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm"
                  >
                    {command.icon && (
                      <command.icon className="text-text-tertiary h-4 w-4 shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span>{command.title}</span>
                      {command.subtitle && (
                        <span className="text-text-tertiary text-xs">{command.subtitle}</span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {appearanceCommands.length > 0 && (
              <Command.Group
                heading="Appearance"
                className="text-text-tertiary px-2 text-xs font-medium"
              >
                {appearanceCommands.map((command) => (
                  <Command.Item
                    key={command.id}
                    value={`${command.id} ${command.title} ${command.keywords?.join(" ") ?? ""}`}
                    onSelect={() => handleCommandSelect(command)}
                    className="text-text-primary aria-selected:bg-accent/10 aria-selected:text-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm"
                  >
                    {command.icon && (
                      <command.icon className="text-text-tertiary h-4 w-4 shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span>{command.title}</span>
                      {command.subtitle && (
                        <span className="text-text-tertiary text-xs">{command.subtitle}</span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* When query doesn't match built-in commands, show file search */}
            <Command.Empty>
              {query.length > 0 && workspaceId && (
                <FileSearchFallback
                  query={query}
                  workspaceId={workspaceId}
                  onSelect={handleFileSelect}
                />
              )}
              {query.length > 0 && !workspaceId && (
                <div className="text-text-secondary px-4 py-3 text-sm">
                  No commands matched &ldquo;{query}&rdquo;
                </div>
              )}
            </Command.Empty>
          </Command.List>

          <div className="border-border-muted text-text-tertiary flex items-center justify-between border-t px-4 py-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="border-border-default bg-bg-tertiary rounded border px-1">↑</kbd>
                <kbd className="border-border-default bg-bg-tertiary rounded border px-1">↓</kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border-border-default bg-bg-tertiary rounded border px-1">↵</kbd>
                <span>to select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="border-border-default bg-bg-tertiary rounded border px-1">ESC</kbd>
              <span>to close</span>
            </span>
          </div>
        </Command>
      </div>
    </Command.Dialog>
  )
}
