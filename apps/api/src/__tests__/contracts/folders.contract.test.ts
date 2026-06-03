import { describe, expect, it } from "vitest"
import {
  BreadcrumbResponse,
  DeleteFolderResponse,
  FolderSchema,
  ListFoldersResponse,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("folders contracts", () => {
  it("lists, creates, updates, breadcrumbs, deletes, and restores folders", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({ name: "Parent", path: "/Parent" })

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/folders`)
    expect(list.status).toBe(200)
    ListFoldersResponse.parse(await ctx.json(list))

    const create = await ctx.request(`/api/workspaces/${ctx.workspaceId}/folders`, {
      method: "POST",
      body: JSON.stringify({ name: "Child", parentFolderId: parent.id }),
    })
    expect(create.status).toBe(201)
    const child = FolderSchema.parse(await ctx.json(create))

    const breadcrumbs = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/folders/${child.id}/breadcrumbs`,
    )
    expect(breadcrumbs.status).toBe(200)
    BreadcrumbResponse.parse(await ctx.json(breadcrumbs))

    const update = await ctx.request(`/api/workspaces/${ctx.workspaceId}/folders/${child.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Child Renamed" }),
    })
    expect(update.status).toBe(200)
    FolderSchema.parse(await ctx.json(update))

    const deleted = await ctx.request(`/api/workspaces/${ctx.workspaceId}/folders/${child.id}`, {
      method: "DELETE",
    })
    expect(deleted.status).toBe(200)
    DeleteFolderResponse.parse(await ctx.json(deleted))
  })

  it("returns 403 for a viewer creating folders and 400 for invalid bodies", async () => {
    const ctx = createContractTestContext()

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/folders`, {
      method: "POST",
      userId: ctx.viewer.id,
      body: JSON.stringify({ name: "Nope" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/folders`, {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
