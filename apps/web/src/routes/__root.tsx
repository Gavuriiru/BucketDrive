import { createRootRoute, createRoute, createRouter, Outlet, Link } from "@tanstack/react-router"
import { Layout } from "@/components/layout/layout"
import { HomePage } from "./home"

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => <div className="p-6">Dashboard</div>,
})

const routeTree = rootRoute.addChildren([homeRoute, dashboardRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
