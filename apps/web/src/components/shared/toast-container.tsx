/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions */
import * as React from "react"
import * as ToastPrimitive from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { useToastStore, dismissToast, type ToastItem } from "@/hooks/use-toast"

const variantStyles: Record<ToastItem["variant"], string> = {
  default: "border-border-default bg-surface-default text-text-primary",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  error: "border-error/30 bg-error/10 text-error",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
}

export function ToastContainer() {
  const toasts: ToastItem[] = useToastStore((s) => s.toasts)

  return (
    <>
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          className={`group relative flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-fade-out data-[state=open]:animate-slide-in data-[swipe=end]:animate-swipe-out ${variantStyles[toast.variant]}`}
          open
          duration={toast.duration ?? 5000}
          onOpenChange={(open) => {
            if (!open) dismissToast(toast.id)
          }}
        >
          <div className="flex-1">
            {toast.title && (
              <ToastPrimitive.Title className="text-sm font-medium">
                {toast.title}
              </ToastPrimitive.Title>
            )}
            {toast.description && (
              <ToastPrimitive.Description className="mt-1 text-xs opacity-90">
                {toast.description}
              </ToastPrimitive.Description>
            )}
            {toast.action && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick()
                    dismissToast(toast.id)
                  }}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <ToastPrimitive.Close
            className="rounded-md p-1 text-text-tertiary transition-colors hover:text-text-primary"
            aria-label="Close"
            onClick={() => dismissToast(toast.id)}
          >
            <X className="h-3.5 w-3.5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
    </>
  )
}
