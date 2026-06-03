import { describe, expect, it } from "vitest"
import { SearchResponse } from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("search contracts", () => {
  it("returns paginated search results with filters", async () => {
    const ctx = createContractTestContext()
    ctx.seedFile({ originalName: "Photo.png", mimeType: "image/png", extension: "png" })

    const response = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/search?type=images&limit=10`,
    )
    expect(response.status).toBe(200)
    SearchResponse.parse(await ctx.json(response))
  })

  it("returns 403 for non-members and 400 for invalid query params", async () => {
    const ctx = createContractTestContext()

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/search`, {
      userId: ctx.outsider.id,
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/search?limit=500`)
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
