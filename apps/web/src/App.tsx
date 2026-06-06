import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./routes"
import { BrandingEffects } from "./lib/branding"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingEffects />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
