import { describe, expect, it } from "vitest"
import {
  DashboardAuditResponse,
  DashboardOverviewResponse,
  DashboardSettingsResponse,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("dashboard contracts", () => {
  it("returns overview, audit, and settings responses", async () => {
    const ctx = createContractTestContext()
    ctx.seedFile({ originalName: "Large.bin", sizeBytes: 100 })

    const overview = await ctx.request(`/api/workspaces/${ctx.workspaceId}/dashboard/overview`)
    expect(overview.status).toBe(200)
    DashboardOverviewResponse.parse(await ctx.json(overview))

    const audit = await ctx.request(`/api/workspaces/${ctx.workspaceId}/dashboard/audit`)
    expect(audit.status).toBe(200)
    DashboardAuditResponse.parse(await ctx.json(audit))

    const settings = await ctx.request(`/api/workspaces/${ctx.workspaceId}/dashboard/settings`)
    expect(settings.status).toBe(200)
    DashboardSettingsResponse.parse(await ctx.json(settings))
  })

  it("enforces settings RBAC and validation", async () => {
    const ctx = createContractTestContext()

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/dashboard/settings`, {
      method: "PATCH",
      userId: ctx.viewer.id,
      body: JSON.stringify({ brandingName: "Viewer" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/dashboard/settings`, {
      method: "PATCH",
      body: JSON.stringify({ maxFileSizeBytes: -1 }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
