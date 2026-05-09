import { Search, Moon, Sun } from "lucide-react"

export function Topbar() {
  return (
    <header className="flex h-topbar items-center gap-4 border-b border-border-muted bg-bg-primary px-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight text-text-primary">
          BucketDrive
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2">
          <Search className="h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search files..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded-md border border-border-default bg-surface-default px-1.5 py-0.5 text-xs text-text-tertiary">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
          <Sun className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-accent" />
      </div>
    </header>
  )
}
