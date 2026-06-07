import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

interface StyledSelectOption<T extends string> {
  value: T
  label: ReactNode
}

interface StyledSelectProps<T extends string> {
  value: T
  options: Array<StyledSelectOption<T>>
  onValueChange: (value: T) => void
  disabled?: boolean
  id?: string
  ariaLabel?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
}

export function StyledSelect<T extends string>({
  value,
  options,
  onValueChange,
  disabled = false,
  id,
  ariaLabel,
  className = "",
  triggerClassName = "",
  contentClassName = "",
}: StyledSelectProps<T>) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={`border-border-default bg-surface-default text-text-primary hover:bg-surface-hover focus:border-accent focus:ring-accent inline-flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${className} ${triggerClassName}`}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? value}</span>
          <ChevronDown className="text-text-tertiary h-4 w-4 shrink-0" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className={`border-border-default bg-surface-default z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border p-1 shadow-lg ${contentClassName}`}
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => {
                onValueChange(option.value)
              }}
              className="text-text-primary hover:bg-surface-hover focus:bg-surface-hover flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors outline-none"
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {value === option.value && <Check className="text-accent h-4 w-4 shrink-0" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
