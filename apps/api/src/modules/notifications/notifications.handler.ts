import { Hono } from "hono"
import { authMiddleware } from "../../middleware/auth"
import {
  ListNotificationsRequest,
  ListNotificationsResponse,
  UnreadCountResponse,
  MarkReadResponse,
  MarkAllReadResponse,
} from "@bucketdrive/shared"
import { NotificationsService } from "./notifications.service"

interface NotificationsEnv {
  DB: D1Database
}

interface NotificationsVariables {
  user: { id: string; email: string; name: string }
}

const notifications = new Hono<{
  Bindings: NotificationsEnv
  Variables: NotificationsVariables
}>()

notifications.use("*", authMiddleware)

notifications.get("/", async (c) => {
  const user = c.get("user")
  const request = ListNotificationsRequest.parse({
    page: c.req.query("page"),
    limit: c.req.query("limit"),
  })

  const service = new NotificationsService()
  const result = await service.listNotifications({
    userId: user.id,
    page: request.page,
    limit: request.limit,
  })

  return c.json(ListNotificationsResponse.parse(result))
})

notifications.get("/unread-count", async (c) => {
  const user = c.get("user")
  const service = new NotificationsService()
  const count = await service.getUnreadCount(user.id)

  return c.json(UnreadCountResponse.parse({ count }))
})

notifications.patch("/:id/read", async (c) => {
  const user = c.get("user")
  const id = c.req.param("id")

  const service = new NotificationsService()
  const result = await service.markAsRead(id, user.id)

  return c.json(MarkReadResponse.parse({ success: true, id: result.id }))
})

notifications.post("/read-all", async (c) => {
  const user = c.get("user")
  const service = new NotificationsService()
  const updatedCount = await service.markAllAsRead(user.id)

  return c.json(MarkAllReadResponse.parse({ success: true, count: updatedCount }))
})

export const notificationsHandler = notifications
