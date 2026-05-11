import * as React from "react"
import * as Toast from "@radix-ui/react-toast"
import type { ReactNode } from "react"

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <Toast.Viewport className="fixed right-0 top-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 sm:right-4 sm:top-4" />
    </Toast.Provider>
  )
}
