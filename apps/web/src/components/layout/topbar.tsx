/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Search, Moon, Sun, Monitor, Check, LogOut } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useRouterState } from "@tanstack/react-router"
import { useSession, useSignOut } from "@/lib/auth"
import { getSearchContextFromPath } from "@/lib/search-context"
import { useAppStore } from "@/stores/app-store"
import { useSearchStore } from "@/stores/search-store"
import { useCommandPaletteStore } from "@/stores/command-palette-store"

export function Topbar() {
  const { data: session, isLoading } = useSession()
  const signOut = useSignOut()
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const searchContext = getSearchContextFromPath(pathname)
  const routeKey = searchContext.routeKey
  const query = useSearchStore((state) => (routeKey ? state[routeKey].query : ""))
  const setRouteQuery = useSearchStore((state) => state.setRouteQuery)

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ]

  const ActiveIcon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

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
            value={query}
            onChange={(event) => {
              if (routeKey) {
                setRouteQuery(routeKey, event.target.value)
              }
            }}
            placeholder={searchContext.placeholder}
            disabled={!searchContext.enabled}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:text-text-tertiary"
          />
          <button
            type="button"
            onClick={() => useCommandPaletteStore.getState().open()}
            className="rounded-md border border-border-default bg-surface-default px-1.5 py-0.5 text-xs text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
            aria-label="Open command palette"
          >
            ⌘K
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label="Change theme"
            >
              <ActiveIcon className="h-5 w-5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[160px] rounded-xl border border-border-default bg-surface-default p-1 shadow-lg"
            >
              {themeOptions.map((option) => (
                <DropdownMenu.Item
                  key={option.value}
                  onSelect={() => setTheme(option.value)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:bg-surface-hover focus:bg-surface-hover"
                >
                  <span className="flex items-center gap-2">
                    <option.icon className="h-4 w-4 text-text-secondary" />
                    {option.label}
                  </span>
                  {theme === option.value && (
                    <Check className="h-4 w-4 text-accent" />
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

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
