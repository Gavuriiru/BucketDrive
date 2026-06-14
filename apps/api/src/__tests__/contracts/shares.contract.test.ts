import { describe, expect, it } from "vitest"
import {
  ListSharesResponse,
  ShareAccessResponse,
  ShareBrowseResponse,
  ShareFileDownloadResponse,
  ShareFilePreviewResponse,
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
      body: JSON.stringify({
        resourceId: file.id,
        resourceType: "file",
        shareType: "external_direct",
      }),
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

  it("browses a public folder share and returns its child files", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({ name: "Shared Folder", path: "/Shared Folder" })
    const file = ctx.seedFile({ folderId: parent.id, originalName: "Nested.txt" })
    const share = ctx.seedShare({
      resourceType: "folder",
      resourceId: parent.id,
      shareType: "external_explorer",
    })

    const browse = await ctx.request(`/api/shares/${share.id}/browse`, {
      method: "POST",
      userId: null,
      body: JSON.stringify({}),
    })

    expect(browse.status).toBe(200)
    const body = ShareBrowseResponse.parse(await ctx.json(browse))
    expect(body.resourceName).toBe(parent.name)
    expect(body.currentFolderId).toBe(parent.id)
    expect(body.files).toEqual([
      {
        id: file.id,
        name: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      },
    ])
  })

  it("previews and downloads files inside a public folder share", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({ name: "Shared Folder", path: "/Shared Folder" })
    const child = ctx.seedFolder({
      parentFolderId: parent.id,
      name: "Child",
      path: "/Shared Folder/Child",
    })
    const file = ctx.seedFile({ folderId: child.id, originalName: "Nested.txt" })
    const outsideFile = ctx.seedFile({ originalName: "Outside.txt" })
    const share = ctx.seedShare({
      resourceType: "folder",
      resourceId: parent.id,
      shareType: "external_explorer",
    })

    const preview = await ctx.request(`/api/shares/${share.id}/files/${file.id}/preview`, {
      method: "POST",
      userId: null,
      body: JSON.stringify({}),
    })
    expect(preview.status).toBe(200)
    const previewBody = ShareFilePreviewResponse.parse(await ctx.json(preview))
    expect(previewBody.fileName).toBe(file.originalName)
    expect(previewBody.mimeType).toBe(file.mimeType)

    const download = await ctx.request(`/api/shares/${share.id}/files/${file.id}/download`, {
      method: "POST",
      userId: null,
      body: JSON.stringify({}),
    })
    expect(download.status).toBe(200)
    const downloadBody = ShareFileDownloadResponse.parse(await ctx.json(download))
    expect(downloadBody.fileName).toBe(file.originalName)

    const countRow = ctx.sqlite
      .prepare("select download_count as downloadCount from share_link where id = ?")
      .get(share.id) as { downloadCount: number }
    expect(countRow.downloadCount).toBe(1)

    const outside = await ctx.request(`/api/shares/${share.id}/files/${outsideFile.id}/preview`, {
      method: "POST",
      userId: null,
      body: JSON.stringify({}),
    })
    expect(outside.status).toBe(404)
    expectApiError(await ctx.json(outside))
  })

  it("requires a folder share password for public file actions", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({ name: "Protected", path: "/Protected" })
    const file = ctx.seedFile({ folderId: parent.id, originalName: "Secret.txt" })

    const create = await ctx.request(`/api/workspaces/${ctx.workspaceId}/shares`, {
      method: "POST",
      body: JSON.stringify({
        resourceId: parent.id,
        resourceType: "folder",
        shareType: "external_explorer",
        password: "test1234",
      }),
    })
    expect(create.status).toBe(201)
    const share = ShareLinkSchema.parse(await ctx.json(create))

    const denied = await ctx.request(`/api/shares/${share.id}/files/${file.id}/preview`, {
      method: "POST",
      userId: null,
      body: JSON.stringify({}),
    })
    expect(denied.status).toBe(401)
    expectApiError(await ctx.json(denied))

    const allowed = await ctx.request(`/api/shares/${share.id}/files/${file.id}/preview`, {
      method: "POST",
      userId: null,
      body: JSON.stringify({ password: "test1234" }),
    })
    expect(allowed.status).toBe(200)
    ShareFilePreviewResponse.parse(await ctx.json(allowed))
  })
})
