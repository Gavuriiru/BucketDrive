import { describe, expect, it } from "vitest"
import {
  ListNotificationsResponse,
  MarkAllReadResponse,
  MarkReadResponse,
  UnreadCountResponse,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("notifications contracts", () => {
  it("lists notifications and marks them read", async () => {
    const ctx = createContractTestContext()
    const notification = ctx.seedNotification()

    const list = await ctx.request("/api/notifications")
    expect(list.status).toBe(200)
    ListNotificationsResponse.parse(await ctx.json(list))

    const count = await ctx.request("/api/notifications/unread-count")
    expect(count.status).toBe(200)
    UnreadCountResponse.parse(await ctx.json(count))

    const read = await ctx.request(`/api/notifications/${notification.id}/read`, { method: "PATCH" })
    expect(read.status).toBe(200)
    MarkReadResponse.parse(await ctx.json(read))

    const readAll = await ctx.request("/api/notifications/read-all", { method: "POST" })
    expect(readAll.status).toBe(200)
    MarkAllReadResponse.parse(await ctx.json(readAll))
  })

  it("requires authentication", async () => {
    const ctx = createContractTestContext()
    const response = await ctx.request("/api/notifications", { userId: null })
    expect(response.status).toBe(401)
    expectApiError(await ctx.json(response))
  })
})
