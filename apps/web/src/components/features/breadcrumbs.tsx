import { ChevronRight, Home } from "lucide-react"
import type { BreadcrumbItem } from "@/lib/api"

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  onNavigate: (id: string | null) => void
  currentFolderId: string | null
}

export function Breadcrumbs({ items, onNavigate, currentFolderId }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const isActive = item.id === currentFolderId || (item.id === null && currentFolderId === null)

        return (
          <span key={item.id ?? "root"} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
            )}
            {item.id === null ? (
              <button
                onClick={() => onNavigate(null)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                  isActive
                    ? "text-text-primary font-medium"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <Home className="h-3.5 w-3.5" />
                {item.name}
              </button>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                disabled={isLast}
                className={`rounded-md px-2 py-1 transition-colors ${
                  isLast
                    ? "text-text-primary font-medium"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {item.name}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
