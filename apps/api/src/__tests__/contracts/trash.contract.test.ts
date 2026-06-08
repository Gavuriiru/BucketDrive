import { describe, expect, it } from "vitest"
import {
  BatchOperationResponse,
  ListTrashResponse,
  RestoreFileResponse,
  RestoreFolderResponse,
} from "@bucketdrive/shared"
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

  it("allows global readers and returns validation errors", async () => {
    const ctx = createContractTestContext()
    const allowed = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash`, {
      userId: ctx.outsider.id,
    })
    expect(allowed.status).toBe(200)
    ListTrashResponse.parse(await ctx.json(allowed))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash?limit=500`)
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })

  it("lists only deleted roots when a deleted folder contains descendants", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({
      name: "Deleted root",
      path: "/Deleted root",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const child = ctx.seedFolder({
      parentFolderId: parent.id,
      name: "Deleted child",
      path: "/Deleted root/Deleted child",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const nestedFile = ctx.seedFile({
      folderId: child.id,
      originalName: "Nested deleted.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const activeFolder = ctx.seedFolder({
      name: "Active folder",
      path: "/Active folder",
    })
    const fileInActiveFolder = ctx.seedFile({
      folderId: activeFolder.id,
      originalName: "Visible deleted.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash?sort=name&order=asc`)
    expect(list.status).toBe(200)
    const body = ListTrashResponse.parse(await ctx.json(list))

    expect(body.data).toEqual([
      expect.objectContaining({ resourceType: "folder", id: parent.id }),
      expect.objectContaining({ resourceType: "file", id: fileInActiveFolder.id }),
    ])
    expect(body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: child.id }),
        expect.objectContaining({ id: nestedFile.id }),
      ]),
    )
    expect(body.meta.total).toBe(2)
  })

  it("restores a deleted folder root with its descendants", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({
      name: "Deleted folder",
      path: "/Deleted folder",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const child = ctx.seedFolder({
      parentFolderId: parent.id,
      name: "Child folder",
      path: "/Deleted folder/Child folder",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const nestedFile = ctx.seedFile({
      folderId: child.id,
      originalName: "Nested deleted.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const restore = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/folders/${parent.id}/restore`,
      { method: "POST" },
    )
    expect(restore.status).toBe(200)
    RestoreFolderResponse.parse(await ctx.json(restore))

    const remainingTrash = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash`)
    const remainingTrashBody = ListTrashResponse.parse(await ctx.json(remainingTrash))
    expect(remainingTrashBody.meta.total).toBe(0)
    const restored = ctx.sqlite
      .prepare(
        `select
          (select is_deleted from folder where id = ?) as parent_deleted,
          (select is_deleted from folder where id = ?) as child_deleted,
          (select is_deleted from file_object where id = ?) as file_deleted`,
      )
      .get(parent.id, child.id, nestedFile.id) as {
      parent_deleted: number
      child_deleted: number
      file_deleted: number
    }
    expect(restored).toEqual({ parent_deleted: 0, child_deleted: 0, file_deleted: 0 })
  })

  it("permanently deletes a deleted folder root with its descendants", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({
      name: "Purge folder",
      path: "/Purge folder",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const child = ctx.seedFolder({
      parentFolderId: parent.id,
      name: "Purge child",
      path: "/Purge folder/Purge child",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const nestedFile = ctx.seedFile({
      folderId: child.id,
      originalName: "Nested purge.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const deleted = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/folders/${parent.id}/permanent`,
      { method: "DELETE" },
    )
    expect(deleted.status).toBe(200)

    const remainingFiles = ctx.sqlite
      .prepare("select count(*) as count from file_object where id = ?")
      .get(nestedFile.id) as { count: number }
    const remainingFolders = ctx.sqlite
      .prepare("select count(*) as count from folder where id in (?, ?)")
      .get(parent.id, child.id) as { count: number }
    expect(remainingFiles.count).toBe(0)
    expect(remainingFolders.count).toBe(0)
  })

  it("restores a directly restored file to its original deleted folder path", async () => {
    const ctx = createContractTestContext()
    ctx.seedFolder({ name: "Projects", path: "/Projects" })
    const deletedParent = ctx.seedFolder({
      name: "Projects",
      path: "/Projects",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const deletedChild = ctx.seedFolder({
      parentFolderId: deletedParent.id,
      name: "Specs",
      path: "/Projects/Specs",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const activeSibling = ctx.seedFile({
      folderId: deletedChild.id,
      originalName: "Plan.txt",
      isDeleted: false,
    })
    const restoredFile = ctx.seedFile({
      folderId: deletedChild.id,
      originalName: "Plan.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const deletedSibling = ctx.seedFile({
      folderId: deletedChild.id,
      originalName: "Sibling.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const restore = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/files/${restoredFile.id}/restore`,
      { method: "POST" },
    )
    expect(restore.status).toBe(200)
    const restoreBody = RestoreFileResponse.parse(await ctx.json(restore))
    expect(restoreBody.restoredToFolderId).toBe(deletedChild.id)
    expect(restoreBody.restoredToRoot).toBe(false)
    expect(restoreBody.restoredName).toBe("Plan (restored).txt")

    const rows = ctx.sqlite
      .prepare(
        `select
          (select is_deleted from folder where id = ?) as parent_deleted,
          (select name from folder where id = ?) as parent_name,
          (select path from folder where id = ?) as parent_path,
          (select is_deleted from folder where id = ?) as child_deleted,
          (select path from folder where id = ?) as child_path,
          (select is_deleted from file_object where id = ?) as file_deleted,
          (select original_name from file_object where id = ?) as file_name,
          (select folder_id from file_object where id = ?) as file_folder_id,
          (select is_deleted from file_object where id = ?) as sibling_deleted,
          (select original_name from file_object where id = ?) as active_sibling_name`,
      )
      .get(
        deletedParent.id,
        deletedParent.id,
        deletedParent.id,
        deletedChild.id,
        deletedChild.id,
        restoredFile.id,
        restoredFile.id,
        restoredFile.id,
        deletedSibling.id,
        activeSibling.id,
      ) as {
      parent_deleted: number
      parent_name: string
      parent_path: string
      child_deleted: number
      child_path: string
      file_deleted: number
      file_name: string
      file_folder_id: string
      sibling_deleted: number
      active_sibling_name: string
    }

    expect(rows).toEqual({
      parent_deleted: 0,
      parent_name: "Projects (restored)",
      parent_path: "/Projects (restored)",
      child_deleted: 0,
      child_path: "/Projects (restored)/Specs",
      file_deleted: 0,
      file_name: "Plan (restored).txt",
      file_folder_id: deletedChild.id,
      sibling_deleted: 1,
      active_sibling_name: "Plan.txt",
    })
  })

  it("restores all trashed resources", async () => {
    const ctx = createContractTestContext()
    const parent = ctx.seedFolder({
      name: "Deleted folder",
      path: "/Deleted folder",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const child = ctx.seedFolder({
      parentFolderId: parent.id,
      name: "Child folder",
      path: "/Deleted folder/Child folder",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const nestedFile = ctx.seedFile({
      folderId: child.id,
      originalName: "Nested deleted.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const rootFile = ctx.seedFile({
      originalName: "Root deleted.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const restore = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash/restore-all`, {
      method: "POST",
    })
    expect(restore.status).toBe(200)
    const restoreBody = BatchOperationResponse.parse(await ctx.json(restore))
    expect(restoreBody.failed).toHaveLength(0)
    expect(restoreBody.processed).toEqual(
      expect.arrayContaining([
        { resourceType: "folder", id: parent.id },
        { resourceType: "file", id: rootFile.id },
      ]),
    )

    const remainingTrash = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash`)
    const remainingTrashBody = ListTrashResponse.parse(await ctx.json(remainingTrash))
    expect(remainingTrashBody.meta.total).toBe(0)
    const restoredNestedFile = ctx.sqlite
      .prepare("select is_deleted from file_object where id = ?")
      .get(nestedFile.id) as { is_deleted: number }
    expect(restoredNestedFile.is_deleted).toBe(0)
  })

  it("empties all trash and enforces permanent delete permission", async () => {
    const ctx = createContractTestContext()
    const folder = ctx.seedFolder({
      name: "Purge folder",
      path: "/Purge folder",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const nestedFile = ctx.seedFile({
      folderId: folder.id,
      originalName: "Nested purge.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })
    const rootFile = ctx.seedFile({
      originalName: "Root purge.txt",
      isDeleted: true,
      deletedAt: "2026-06-02T12:00:00.000Z",
    })

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash/empty`, {
      method: "POST",
      userId: ctx.viewer.id,
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const emptied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/trash/empty`, {
      method: "POST",
    })
    expect(emptied.status).toBe(200)
    const emptiedBody = BatchOperationResponse.parse(await ctx.json(emptied))
    expect(emptiedBody.failed).toHaveLength(0)
    expect(emptiedBody.processed).toEqual(
      expect.arrayContaining([
        { resourceType: "folder", id: folder.id },
        { resourceType: "file", id: rootFile.id },
      ]),
    )
    const remainingFiles = ctx.sqlite
      .prepare("select count(*) as count from file_object where id in (?, ?)")
      .get(rootFile.id, nestedFile.id) as { count: number }
    const remainingFolders = ctx.sqlite
      .prepare("select count(*) as count from folder where id = ?")
      .get(folder.id) as { count: number }
    expect(remainingFiles.count).toBe(0)
    expect(remainingFolders.count).toBe(0)
  })
})
