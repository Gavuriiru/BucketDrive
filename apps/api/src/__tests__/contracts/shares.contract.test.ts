import { describe, expect, it } from "vitest"
import {
  ListSharesResponse,
  ShareAccessResponse,
  ShareInfoResponse,
  ShareLinkSchema,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("shares contracts", () => {
  it("creates, lists, updates, revokes, and publicly accesses shares", async () => {
    const ctx = createContractTestContext()
    const file = ctx.seedFile({ originalName: "Shared.txt" })

    const create = await ctx.request(`/api/workspaces/${ctx.workspaceId}/shares`, {
      method: "POST",
      body: JSON.stringify({
        resourceId: file.id,
        resourceType: "file",
        shareType: "external_direct",
        permissions: ["read", "download"],
      }),
    })
    expect(create.status).toBe(201)
    const share = ShareLinkSchema.parse(await ctx.json(create))

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/shares`)
    expect(list.status).toBe(200)
    ListSharesResponse.parse(await ctx.json(list))

    const info = await ctx.request(`/api/shares/${share.id}`, { userId: null })
    expect(info.status).toBe(200)
    ShareInfoResponse.parse(await ctx.json(info))

    const access = await ctx.request(`/api/shares/${share.id}/access`, {
      method: "POST",
      userId: null,
      body: JSON.stringify({}),
    })
    expect(access.status).toBe(200)
    ShareAccessResponse.parse(await ctx.json(access))

    const update = await ctx.request(`/api/workspaces/${ctx.workspaceId}/shares/${share.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    expect(update.status).toBe(200)
    ShareLinkSchema.parse(await ctx.json(update))

    const revoke = await ctx.request(`/api/workspaces/${ctx.workspaceId}/shares/${share.id}`, {
      method: "DELETE",
    })
    expect(revoke.status).toBe(200)
    expect((await ctx.json<{ success: boolean; shareId: string }>(revoke)).success).toBe(true)
  })

  it("enforces share RBAC and validation", async () => {
    const ctx = createContractTestContext()
    const file = ctx.seedFile()

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/shares`, {
      method: "POST",
      userId: ctx.viewer.id,
      body: JSON.stringify({ resourceId: file.id, resourceType: "file", shareType: "external_direct" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/shares`, {
      method: "POST",
      body: JSON.stringify({ resourceId: file.id, resourceType: "file", shareType: "bad" }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
