import { createMiddleware } from "hono/factory"

export const securityHeaders = createMiddleware(async (c, next) => {
  await next()

  c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  c.res.headers.set("X-Content-Type-Options", "nosniff")
  c.res.headers.set("X-Frame-Options", "DENY")
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  c.res.headers.set("X-XSS-Protection", "0")
  c.res.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  c.res.headers.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'",
  )
})
