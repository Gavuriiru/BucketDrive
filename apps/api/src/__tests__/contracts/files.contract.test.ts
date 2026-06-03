import { describe, expect, it } from "vitest"
import {
  DeleteFileResponse,
  DownloadUrlResponse,
  FileObjectSchema,
  GetUploadSessionResponse,
  InitiateUploadResponse,
  ListFilesResponse,
  PreviewUrlResponse,
  ThumbnailUrlResponse,
  ToggleFavoriteResponse,
  UpdateFileTagsResponse,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("files contracts", () => {
  it("lists, uploads, reads, updates, favorites, tags, and deletes files", async () => {
    const ctx = createContractTestContext()
    const existing = ctx.seedFile({ originalName: "Alpha.txt" })
    const tag = ctx.seedTag()

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files?limit=10`)
    expect(list.status).toBe(200)
    ListFilesResponse.parse(await ctx.json(list))

    const initiate = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/upload`, {
      method: "POST",
      body: JSON.stringify({ fileName: "Upload.txt", mimeType: "text/plain", sizeBytes: 12 }),
    })
    expect(initiate.status).toBe(201)
    const initiated = InitiateUploadResponse.parse(await ctx.json(initiate))

    const session = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/uploads/${initiated.uploadId}`)
    expect(session.status).toBe(200)
    GetUploadSessionResponse.parse(await ctx.json(session))

    const complete = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/upload/complete`, {
      method: "POST",
      body: JSON.stringify({
        uploadId: initiated.uploadId,
        fileName: "Upload.txt",
        mimeType: "text/plain",
      }),
    })
    expect(complete.status).toBe(201)
    FileObjectSchema.parse(await ctx.json(complete))

    const getFile = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${existing.id}`)
    expect(getFile.status).toBe(200)
    FileObjectSchema.parse(await ctx.json(getFile))

    const preview = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${existing.id}/preview`)
    expect(preview.status).toBe(200)
    PreviewUrlResponse.parse(await ctx.json(preview))

    const download = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${existing.id}/download`)
    expect(download.status).toBe(200)
    DownloadUrlResponse.parse(await ctx.json(download))

    const renamed = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Renamed.txt" }),
    })
    expect(renamed.status).toBe(200)
    FileObjectSchema.parse(await ctx.json(renamed))

    const favorite = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${existing.id}/favorite`, {
      method: "POST",
    })
    expect(favorite.status).toBe(200)
    ToggleFavoriteResponse.parse(await ctx.json(favorite))

    const tags = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${existing.id}/tags`, {
      method: "POST",
      body: JSON.stringify({ tagIds: [tag.id] }),
    })
    expect(tags.status).toBe(200)
    UpdateFileTagsResponse.parse(await ctx.json(tags))

    const thumbnailFile = ctx.seedFile({ originalName: "Image.png", mimeType: "image/png", extension: "png", thumbnailKey: "thumbs/image.webp" })
    const thumbnail = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${thumbnailFile.id}/thumbnail`)
    expect(thumbnail.status).toBe(200)
    ThumbnailUrlResponse.parse(await ctx.json(thumbnail))

    const deleted = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${existing.id}`, {
      method: "DELETE",
    })
    expect(deleted.status).toBe(200)
    DeleteFileResponse.parse(await ctx.json(deleted))
  })

  it("enforces RBAC and validates upload payloads", async () => {
    const ctx = createContractTestContext()
    const file = ctx.seedFile()

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/${file.id}`, {
      method: "DELETE",
      userId: ctx.viewer.id,
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/files/upload`, {
      method: "POST",
      body: JSON.stringify({ fileName: "", mimeType: "text/plain", sizeBytes: -1 }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
