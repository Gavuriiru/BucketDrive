import { describe, expect, it } from "vitest"
import { unzipSync } from "fflate"
import { BatchOperationResponse } from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("batch contracts", () => {
  it("moves files and folders to trash and restores them", async () => {
    const ctx = createContractTestContext()
    const file = ctx.seedFile({ originalName: "Batch file.txt" })
    const folder = ctx.seedFolder({ name: "Batch folder", path: "/Batch folder" })

    const trash = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/trash`, {
      method: "POST",
      body: JSON.stringify({ files: [file.id], folders: [folder.id] }),
    })
    expect(trash.status).toBe(200)
    const trashBody = BatchOperationResponse.parse(await ctx.json(trash))
    expect(trashBody.processed).toHaveLength(2)
    expect(trashBody.failed).toHaveLength(0)

    const restore = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/restore`, {
      method: "POST",
      body: JSON.stringify({ files: [file.id], folders: [folder.id] }),
    })
    expect(restore.status).toBe(200)
    const restoreBody = BatchOperationResponse.parse(await ctx.json(restore))
    expect(restoreBody.processed).toHaveLength(2)
    expect(restoreBody.failed).toHaveLength(0)
  })

  it("permanently deletes trash in batch and reports permission failures", async () => {
    const ctx = createContractTestContext()
    const file = ctx.seedFile({
      originalName: "Delete forever.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/permanent-delete`, {
      method: "POST",
      userId: ctx.viewer.id,
      body: JSON.stringify({ files: [file.id], folders: [] }),
    })
    expect(denied.status).toBe(403)
    const deniedBody = BatchOperationResponse.parse(await ctx.json(denied))
    expect(deniedBody.processed).toHaveLength(0)
    expect(deniedBody.failed[0]?.code).toBe("FORBIDDEN")

    const deleted = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/permanent-delete`, {
      method: "POST",
      body: JSON.stringify({ files: [file.id], folders: [] }),
    })
    expect(deleted.status).toBe(200)
    const deletedBody = BatchOperationResponse.parse(await ctx.json(deleted))
    expect(deletedBody.processed).toHaveLength(1)
  })

  it("moves active resources in batch", async () => {
    const ctx = createContractTestContext()
    const target = ctx.seedFolder({ name: "Target", path: "/Target" })
    const file = ctx.seedFile({ originalName: "Move me.txt" })
    const folder = ctx.seedFolder({ name: "Move folder", path: "/Move folder" })

    const moved = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/move`, {
      method: "POST",
      body: JSON.stringify({ files: [file.id], folders: [folder.id], targetFolderId: target.id }),
    })
    expect(moved.status).toBe(200)
    const movedBody = BatchOperationResponse.parse(await ctx.json(moved))
    expect(movedBody.processed).toHaveLength(2)
    expect(movedBody.failed).toHaveLength(0)
  })

  it("streams selected files and folder contents as a zip download", async () => {
    const ctx = createContractTestContext()
    const folder = ctx.seedFolder({ name: "Reports", path: "/Reports" })
    const directFile = ctx.seedFile({ originalName: "Root.txt" })
    const folderFile = ctx.seedFile({
      folderId: folder.id,
      originalName: "Report.txt",
      storageKey: "bucket/files/report.txt",
    })
    await ctx.env.STORAGE.put(directFile.storageKey, "root file")
    await ctx.env.STORAGE.put(folderFile.storageKey, "folder file")

    const downloaded = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/download`, {
      method: "POST",
      body: JSON.stringify({ files: [directFile.id], folders: [folder.id] }),
    })

    expect(downloaded.status).toBe(200)
    expect(downloaded.headers.get("Content-Type")).toContain("application/zip")
    expect(downloaded.headers.get("Content-Disposition")).toContain(".zip")

    const zip = unzipSync(new Uint8Array(await downloaded.arrayBuffer()))
    expect(Object.keys(zip).sort()).toEqual(["Reports/Report.txt", "Root.txt"])
    expect(new TextDecoder().decode(zip["Root.txt"])).toBe("root file")
    expect(new TextDecoder().decode(zip["Reports/Report.txt"])).toBe("folder file")
  })

  it("returns a clear error when a selected folder has no downloadable files", async () => {
    const ctx = createContractTestContext()
    const folder = ctx.seedFolder({ name: "Empty", path: "/Empty" })

    const downloaded = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/download`, {
      method: "POST",
      body: JSON.stringify({ files: [], folders: [folder.id] }),
    })

    expect(downloaded.status).toBe(404)
    const body = await ctx.json<{ code: string; message: string }>(downloaded)
    expect(body.code).toBe("NO_DOWNLOADABLE_FILES")
    expect(body.message).toBe("No downloadable files found")
  })

  it("revokes shares in batch and validates empty payloads", async () => {
    const ctx = createContractTestContext()
    const file = ctx.seedFile()
    const share = ctx.seedShare({ resourceId: file.id, shareType: "external_direct" })

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/shares/revoke`, {
      method: "POST",
      body: JSON.stringify({ shareIds: [] }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))

    const revoked = await ctx.request(`/api/workspaces/${ctx.workspaceId}/batch/shares/revoke`, {
      method: "POST",
      body: JSON.stringify({ shareIds: [share.id] }),
    })
    expect(revoked.status).toBe(200)
    const revokedBody = BatchOperationResponse.parse(await ctx.json(revoked))
    expect(revokedBody.processed).toHaveLength(1)
  })
})
