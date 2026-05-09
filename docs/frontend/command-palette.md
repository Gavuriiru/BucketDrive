# Command Palette

# Purpose

This document defines the command palette (`Ctrl/Cmd + K`) behavior and available commands.

The command palette provides keyboard-first access to all actions in the platform,
enabling power users to navigate and execute commands without touching the mouse.

---

# Core Principles

## 1. Universal Access

Every action available in the UI via menus or buttons must be accessible from the command palette.

## 2. Search-First

The primary interaction is type-to-search. Users type partial command names or file names
and the palette narrows results in real time.

## 3. Context-Aware

Available commands vary based on context:
- **Explorer context**: file/folder actions (rename, share, delete, move)
- **Global context**: navigation, settings, theme toggle
- **Selection context**: bulk actions when multiple files are selected

## 4. Keyboard Navigation

Fully navigable by keyboard:
- `↑↓` — move between results
- `Enter` — execute selected command
- `Esc` — close palette
- `Tab` — cycle between command categories (when applicable)

---

# Activation

## Shortcut

`Ctrl/Cmd + K` opens the palette from anywhere in the application.

The palette:
- Opens centered on screen with backdrop blur
- Auto-focuses the search input
- Shows recent/relevant commands by default
- Animates in: fade + slight scale-up (150ms ease-out)

## Alternate Triggers

- `Ctrl/Cmd + F` — opens palette in "search files" mode (pre-filled with file search context)
- Click on the "⌘K" button in the top navigation bar

---

# Command Categories

## Navigation Commands

```txt
Go to Files              → /dashboard/files
Go to Shared             → /dashboard/shares
Go to Trash              → /dashboard/trash
Go to Settings           → /dashboard/settings
Go to Dashboard          → /dashboard
Go to Workspace Settings → /dashboard/workspace/settings
Go back                  → Back navigation
Go forward               → Forward navigation
```

## File Operations (with selection)

```txt
Rename                   → Opens rename inline or modal
Move to...               → Opens folder picker
Copy                     → Copies file(s) to clipboard
Delete                   → Moves to trash (with confirmation)
Download                 → Initiates download
Share                    → Opens share modal
Add tag...               → Opens tag picker
Toggle favorite          → Favorites/unfavorites file
Preview (Space)          → Opens inline preview
```

## Folder Operations

```txt
New folder               → Creates folder in current directory
Open folder              → Enters selected folder
Rename folder            → Renames selected folder
Delete folder            → Moves to trash (recursive, with confirmation)
```

## Bulk Operations (multiple files selected)

```txt
Delete selected          → Moves all selected to trash
Move selected to...      → Moves all selected to folder
Download selected        → Downloads as ZIP
Share selected           → Opens share modal (creates one link for all)
```

## Workspace & Account

```txt
Switch workspace...      → Shows workspace list to switch active context
Invite member...         → Opens invite modal
View profile             → Opens profile settings
Manage sessions          → Lists active sessions
```

## Appearance

```txt
Toggle dark mode         → Switches theme
Switch to grid view      → Sets explorer to grid layout
Switch to list view      → Sets explorer to list layout
```

## Utility

```txt
Search files...          → Opens search with focus on search input
Upload files             → Opens native file picker
Create share link        → Opens share modal (no file preselected)
```

---

# Search Behavior

## Ranking

Results are ranked by:
1. Exact match on command name (highest priority)
2. Prefix match on command name
3. Fuzzy match on command name and keywords
4. Recent usage (frequently used commands rank higher)

## File Search Integration

When typing a query that doesn't match any command, the palette falls back to file search:

```txt
User types: "quarterly"
    ↓
No command matches "quarterly"
    ↓
Palette searches files: "quarterly" across all workspaces
    ↓
Shows: "Search files for 'quarterly'" → Enter opens explorer with search pre-filled
Shows: Top 3 file matches (clickable, opens the file)
```

## Empty State

```
┌──────────────────────────────────┐
│ > _                              │
│                                  │
│ Recent Commands                  │
│   Go to Files                    │
│   Create share link              │
│   Toggle dark mode               │
│                                  │
│ Tip: Type to search commands     │
│ or file names                    │
└──────────────────────────────────┘
```

---

# UI Design

## Layout

```
┌────────────────────────────────────────┐
│  ⌘K  │  Search commands...          │  │
│       │ [esc to close]              │  │
├────────────────────────────────────────┤
│ Commands                               │
│   ➤ Go to Files                  ⌘F   │
│   ➤ Go to Shared                 ⌘S   │
│   ➤ Go to Trash                       │
│                                        │
│ File Operations                        │
│   ➤ Rename                       F2   │
│   ➤ Delete                       ⌫    │
│   ➤ Share                             │
│   ➤ Toggle favorite              ⇧F   │
└────────────────────────────────────────┘
```

## Styling

- Background: `bg-card` with backdrop blur (`backdrop-blur-xl`)
- Border: `border-default`, rounded-2xl
- Shadow: elevation 3 (card hover shadow)
- Input: transparent background, text-lg, no border
- Results: hover state with subtle bg change, rounded-md
- Selected item: bg-accent/10, accent border-left
- Category headers: text-xs, text-secondary, uppercase tracking, 6px padding
- Height: max 400px, scrollable if more results
- Width: 560px fixed

---

# Keyboard Shortcuts Within Palette

| Key | Action |
|---|---|
| `↑` / `↓` | Move selection up/down |
| `←` / `→` | Move between categories (if horizontal layout) |
| `Enter` | Execute selected command |
| `Esc` | Close palette |
| `Tab` | Cycle focus between input and results |

---

# Technical Implementation

## Component Structure

```txt
apps/web/src/components/shared/
  command-palette.tsx        # Main palette component
  command-palette-input.tsx  # Search input
  command-palette-results.tsx # Results list
  command-palette-item.tsx   # Individual result item
  commands/                   # Command definitions
    navigation.ts
    file-operations.ts
    workspace.ts
    appearance.ts
    index.ts                  # Exports all commands
```

## Command Definition Format

```ts
// apps/web/src/components/shared/commands/file-operations.ts
export interface Command {
  id: string
  label: string
  description?: string
  icon?: LucideIcon
  shortcut?: string
  category: "navigation" | "file" | "folder" | "bulk" | "workspace" | "appearance"
  keywords?: string[]          // Additional search terms
  condition?: (ctx: CommandContext) => boolean  // When to show
  action: (ctx: CommandContext) => void
}

export const fileCommands: Command[] = [
  {
    id: "file.rename",
    label: "Rename",
    description: "Rename the selected file",
    icon: Pencil,
    shortcut: "F2",
    category: "file",
    keywords: ["name", "edit", "change"],
    condition: (ctx) => ctx.selectedFiles.length === 1,
    action: (ctx) => ctx.startRename(ctx.selectedFiles[0]),
  },
  {
    id: "file.delete",
    label: "Delete",
    description: "Move selected files to trash",
    icon: Trash,
    shortcut: "Delete",
    category: "file",
    keywords: ["remove", "trash"],
    condition: (ctx) => ctx.selectedFiles.length > 0,
    action: (ctx) => ctx.deleteFiles(ctx.selectedFiles),
  },
  // ...
]
```

## State Integration

```ts
// Zustand store
interface CommandPaletteState {
  isOpen: boolean
  query: string
  selectedIndex: number
  open: () => void
  close: () => void
  setQuery: (q: string) => void
  moveSelection: (direction: "up" | "down") => void
}
```

## Keyboard Hook

```ts
// apps/web/src/hooks/use-command-palette.ts
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      toggleCommandPalette()
    }
    if (e.key === "Escape" && commandPalette.isOpen) {
      closeCommandPalette()
    }
  }
  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}, [])
```

---

# Future Extensibility

Commands are defined declaratively, making it easy to add new ones:

1. Create a `Command` object in the appropriate category file
2. Export from category's `index.ts`
3. Command automatically appears in palette (filtered by `condition`)

Future integrations:
- Plugin system: third-party plugins can register commands
- AI commands: "Summarize this file", "Translate filename"
- Workflow commands: "Run backup", "Export workspace"

---

# Accessibility

- `aria-label="Command palette"` on container
- `role="dialog"` on palette (modal behavior)
- `aria-activedescendant` on selected result
- Focus trap: Tab cycles within palette, Esc releases
- Screen reader announces: "Command palette opened, type to search"
- Visible focus ring on selected item
- Respects `prefers-reduced-motion` for animation

---

# References

- [Frontend Interactions — Keyboard Shortcuts](interactions.md#keyboard-shortcuts)
- [Design System — Modals](design-system.md#modals)
- [Search System](search-system.md)
