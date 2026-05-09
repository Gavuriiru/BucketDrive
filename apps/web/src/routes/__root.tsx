import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router"
import { Layout } from "@/components/layout/layout"
import { HomePage } from "./home"
import { LoginPage } from "./login"
import { DashboardPage } from "./app/dashboard"

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

async function checkAuth(): Promise<{ user: Record<string, unknown> } | null> {
  const res = await fetch("/api/auth/get-session", { credentials: "include" })
  if (!res.ok) return null
  const data = await res.json()
  return data as { user: Record<string, unknown> } | null
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
    const session = await checkAuth()
    if (session?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/dashboard" })
    }
  },
  component: LoginPage,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: async () => {
    const session = await checkAuth()
    if (!session?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" })
    }
  },
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: HomePage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/dashboard",
  component: DashboardPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([homeRoute, dashboardRoute]),
])

export const router = createRouter({
  routeTree,
  defaultPendingComponent: () => (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  ),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
