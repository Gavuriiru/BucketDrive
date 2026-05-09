import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"

const shares = new Hono()

shares.use("*", authMiddleware)

shares.get("/", requirePermission("shares.read"), async (c) => {
  // TODO: List shares in workspace
  return c.json({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } })
})

shares.post("/", requirePermission("shares.create"), async (c) => {
  // TODO: Create share link
  return c.json({ message: "Share created" })
})

shares.patch("/:shareId", requirePermission("shares.update"), async (c) => {
  // TODO: Update share (password, expiration)
  return c.json({ message: "Share updated" })
})

shares.delete("/:shareId", requirePermission("shares.revoke"), async (c) => {
  // TODO: Revoke share
  return c.json({ message: "Share revoked" })
})

// Public share access (no auth required)
const publicShares = new Hono()
publicShares.post("/:shareId/access", async (c) => {
  // TODO: Validate password, grant access
  return c.json({ message: "Access granted" })
})

export const sharesHandler = shares
