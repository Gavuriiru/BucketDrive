import { Hono } from "hono"
import { cors } from "hono/cors"
import { securityHeaders } from "./middleware/security-headers"
import { createAuth } from "./lib/auth"
import { createD1DB } from "./lib/db"
import { filesHandler } from "./modules/files/files.handler"
import { sharesHandler } from "./modules/shares/shares.handler"
import { workspacesHandler } from "./modules/workspaces/workspaces.handler"

interface Env {
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  DB: D1Database
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  STORAGE: R2Bucket
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ENDPOINT?: string
}

const app = new Hono<{ Bindings: Env }>()

app.use("*", securityHeaders)
app.use("*", cors({
  origin: (origin) => origin,
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
}))

app.use("*", async (c, next) => {
  createD1DB(c.env.DB)
  await next()
})

app.all("/api/auth/*", (c) => {
  const auth = createAuth(c.env)
  return auth.handler(c.req.raw)
})

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }))

app.route("/api/workspaces/:workspaceId/files", filesHandler)
app.route("/api/workspaces/:workspaceId/shares", sharesHandler)
app.route("/api/workspaces", workspacesHandler)

app.notFound((c) => c.json({ code: "NOT_FOUND", message: "Not found" }, 404))

app.onError((err, c) => {
  console.error("Unhandled error:", err)
  return c.json({
    code: "INTERNAL_ERROR",
    message: err instanceof Error ? err.message : "An unexpected error occurred",
  }, 500)
})

export default app
