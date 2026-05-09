/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Search, Moon, Sun, LogOut } from "lucide-react"
import { useSession, useSignOut } from "@/lib/auth"
import { useAppStore } from "@/stores/app-store"

export function Topbar() {
  const { data: session, isLoading } = useSession()
  const signOut = useSignOut()
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

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
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {isLoading ? (
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
        ) : session?.user ? (
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden text-sm font-medium text-text-primary md:block">
              {session.user.name}
            </span>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-accent" />
        )}
      </div>
    </header>
  )
}
