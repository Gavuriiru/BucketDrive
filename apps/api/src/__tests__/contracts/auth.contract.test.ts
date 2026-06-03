import { describe, expect, it } from "vitest"
import { PlatformSettingsResponse } from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("auth contracts", () => {
  it("returns 401 for protected routes without a session", async () => {
    const ctx = createContractTestContext()

    const response = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files`, { userId: null })
    const body = await ctx.json(response)

    expect(response.status).toBe(401)
    expectApiError(body)
  })

  it("returns platform settings from a public route", async () => {
    const ctx = createContractTestContext()

    const response = await ctx.request("/api/platform/settings", { userId: null })
    const body = await ctx.json(response)

    expect(response.status).toBe(200)
    expect(() => PlatformSettingsResponse.parse(body)).not.toThrow()
  })
})
