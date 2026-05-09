import { createMiddleware } from "hono/factory"

export const requirePermission = (permission: string) => {
  return createMiddleware(async (c, next) => {
    const user = c.get("user")
    const workspaceId = c.req.param("workspaceId")

    if (!user || !workspaceId) {
      return c.json({ code: "FORBIDDEN", message: "Permission denied" }, 403)
    }

    // TODO: Implement actual can() check against D1
    // const allowed = await can(c.env.DB, user.id, permission, workspaceId)
    // if (!allowed) {
    //   return c.json({ code: "FORBIDDEN", message: "Permission denied" }, 403)
    // }

    await next()
  })
}
