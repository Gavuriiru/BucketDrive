import { eq, and, desc, count } from "drizzle-orm"
import { getDB } from "../../lib/db"
import { notification } from "@bucketdrive/shared/db/schema"
import type { NotificationType } from "@bucketdrive/shared"

export interface CreateNotificationParams {
  userId: string
  workspaceId?: string | null
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
}

export class NotificationsService {
  async createNotification(params: CreateNotificationParams) {
    const db = getDB()
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    await db
      .insert(notification)
      .values({
        id,
        userId: params.userId,
        workspaceId: params.workspaceId ?? null,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
        isRead: false,
        createdAt: now,
      })
      .run()

    return {
      id,
      userId: params.userId,
      workspaceId: params.workspaceId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data ? JSON.stringify(params.data) : null,
      isRead: false,
      createdAt: now,
    }
  }

  async listNotifications(params: { userId: string; page: number; limit: number }) {
    const db = getDB()
    const { userId, page, limit } = params
    const offset = (page - 1) * limit

    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(notification)
        .where(eq(notification.userId, userId))
        .orderBy(desc(notification.createdAt))
        .limit(limit)
        .offset(offset)
        .all(),
      db
        .select({ total: count() })
        .from(notification)
        .where(eq(notification.userId, userId))
        .get(),
    ])

    const total = totalRow?.total ?? 0

    return {
      data: rows.map((n) => ({
        ...n,
        data: n.data ?? undefined,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getUnreadCount(userId: string) {
    const db = getDB()
    const row = await db
      .select({ count: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)))
      .get()

    return row?.count ?? 0
  }

  async markAsRead(notificationId: string, userId: string) {
    const db = getDB()
    await db
      .update(notification)
      .set({ isRead: true })
      .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
      .run()

    return { id: notificationId }
  }

  async markAllAsRead(userId: string) {
    const db = getDB()
    const before = await this.getUnreadCount(userId)
    await db
      .update(notification)
      .set({ isRead: true })
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)))
      .run()

    return before
  }
}
