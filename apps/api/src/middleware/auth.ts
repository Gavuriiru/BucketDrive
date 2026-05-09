import { createMiddleware } from "hono/factory"
import { createAuth } from "../lib/auth"

interface AuthVariables {
  user: { id: string; email: string; name: string }
  session: { id: string; userId: string; expiresAt: Date }
}

export const authMiddleware = createMiddleware<{
  Bindings: { BETTER_AUTH_SECRET?: string; DB: D1Database; GITHUB_CLIENT_ID?: string; GITHUB_CLIENT_SECRET?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string }
  Variables: AuthVariables
}>(async (c, next) => {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    return c.json({ code: "UNAUTHORIZED", message: "Authentication required" }, 401)
  }

  c.set("user", session.user)
  c.set("session", session.session)

  await next()
})
