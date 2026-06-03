import { describe, expect, it } from "vitest"
import { CreateWorkspaceResponse, OwnershipTransferResponse, WorkspaceSchema } from "@bucketdrive/shared"
import { z } from "zod"
import { createContractTestContext, expectApiError } from "./test-harness"

const ListWorkspacesResponse = z.object({ data: z.array(WorkspaceSchema) })

describe("workspaces contracts", () => {
  it("lists, creates, and transfers workspace ownership", async () => {
    const ctx = createContractTestContext()

    const list = await ctx.request("/api/workspaces")
    expect(list.status).toBe(200)
    ListWorkspacesResponse.parse(await ctx.json(list))

    const create = await ctx.request("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Created Workspace", slug: "created-workspace" }),
    })
    expect(create.status).toBe(201)
    CreateWorkspaceResponse.parse(await ctx.json(create))

    const transfer = await ctx.request(`/api/workspaces/${ctx.workspaceId}/transfer-ownership`, {
      method: "POST",
      body: JSON.stringify({ newOwnerId: ctx.admin.id }),
    })
    expect(transfer.status).toBe(200)
    OwnershipTransferResponse.parse(await ctx.json(transfer))
  })

  it("enforces creation permissions and validation", async () => {
    const ctx = createContractTestContext()
    ctx.sqlite.prepare("update platform_settings set allow_user_workspace_creation = 0").run()

    const denied = await ctx.request("/api/workspaces", {
      method: "POST",
      userId: ctx.viewer.id,
      body: JSON.stringify({ name: "Denied Workspace" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "", slug: "bad slug" }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
