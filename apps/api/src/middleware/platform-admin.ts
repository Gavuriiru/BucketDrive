import { createMiddleware } from "hono/factory"

interface PlatformAdminVariables {
  user: { id: string; email: string; name: string; isPlatformAdmin: boolean; canCreateWorkspaces: boolean }
}

export const requirePlatformAdmin = createMiddleware<{
  Variables: PlatformAdminVariables
}>(async (c, next) => {
  const user = c.get("user")
  if (!user.isPlatformAdmin) {
    return c.json({ code: "FORBIDDEN", message: "Platform admin access required" }, 403)
  }
  await next()
})
