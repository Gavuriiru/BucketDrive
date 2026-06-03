import { describe, expect, it } from "vitest"
import { ListTrashResponse, RestoreFileResponse } from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("trash contracts", () => {
  it("lists trashed resources and restores files", async () => {
    const ctx = createContractTestContext()
    const trashed = ctx.seedFile({
      originalName: "Deleted.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash`)
    expect(list.status).toBe(200)
    ListTrashResponse.parse(await ctx.json(list))

    const restore = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/files/${trashed.id}/restore`,
      {
        method: "POST",
      },
    )
    expect(restore.status).toBe(200)
    RestoreFileResponse.parse(await ctx.json(restore))
  })

  it("returns RBAC and validation errors", async () => {
    const ctx = createContractTestContext()
    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash`, {
      userId: ctx.outsider.id,
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash?limit=500`)
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
