import { describe, expect, it } from "vitest"
import { DeleteTagResponse, ListTagsResponse, TagSchema } from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("tags contracts", () => {
  it("lists, creates, updates, and deletes tags", async () => {
    const ctx = createContractTestContext()
    const seeded = ctx.seedTag({ name: "Seeded" })

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/tags`)
    expect(list.status).toBe(200)
    ListTagsResponse.parse(await ctx.json(list))

    const create = await ctx.request(`/api/workspaces/${ctx.workspaceId}/tags`, {
      method: "POST",
      body: JSON.stringify({ name: "Client", color: "#00ff00" }),
    })
    expect(create.status).toBe(201)
    TagSchema.parse(await ctx.json(create))

    const update = await ctx.request(`/api/workspaces/${ctx.workspaceId}/tags/${seeded.id}`, {
      method: "PATCH",
      body: JSON.stringify({ color: "#0000ff" }),
    })
    expect(update.status).toBe(200)
    TagSchema.parse(await ctx.json(update))

    const deleted = await ctx.request(`/api/workspaces/${ctx.workspaceId}/tags/${seeded.id}`, {
      method: "DELETE",
    })
    expect(deleted.status).toBe(200)
    DeleteTagResponse.parse(await ctx.json(deleted))
  })

  it("rejects duplicate tags and viewer mutations", async () => {
    const ctx = createContractTestContext()
    ctx.seedTag({ name: "Duplicate" })

    const duplicate = await ctx.request(`/api/workspaces/${ctx.workspaceId}/tags`, {
      method: "POST",
      body: JSON.stringify({ name: "Duplicate", color: "#111111" }),
    })
    expect(duplicate.status).toBe(409)
    expectApiError(await ctx.json(duplicate))

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/tags`, {
      method: "POST",
      userId: ctx.viewer.id,
      body: JSON.stringify({ name: "Viewer", color: "#111111" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))
  })
})
