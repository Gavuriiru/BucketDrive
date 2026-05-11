import { describe, it, expect } from "vitest"
import { can } from "../can"
import type { WorkspaceRole } from "../../schemas/common"
import type { Permission } from "../permissions"
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from "../permissions"

describe("can() — RBAC permission evaluation", () => {
  const roles: WorkspaceRole[] = ["owner", "admin", "editor", "viewer"]

  describe("owner", () => {
    it("has all permissions", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(can("owner", permission)).toBe(true)
      }
    })
  })

  describe("admin", () => {
    const adminAllowed = ROLE_PERMISSIONS.admin

    it("has all permissions except workspace.delete and workspace.transfer", () => {
      for (const permission of ALL_PERMISSIONS) {
        if (permission === "workspace.delete" || permission === "workspace.transfer") {
          expect(can("admin", permission)).toBe(false)
        } else {
          expect(can("admin", permission)).toBe(true)
        }
      }
    })

    it("has at least these permissions", () => {
      for (const permission of adminAllowed) {
        expect(can("admin", permission)).toBe(true)
      }
    })
  })

  describe("editor", () => {
    const editorAllowed = ROLE_PERMISSIONS.editor
    const editorDenied: Permission[] = [
      "files.delete",
      "files.restore",
      "folders.delete",
      "users.invite",
      "users.remove",
      "users.update_roles",
      "users.read",
      "billing.read",
      "billing.manage",
      "analytics.read",
      "audit.read",
      "audit.export",
      "workspace.settings.read",
      "workspace.settings.update",
      "workspace.delete",
      "workspace.transfer",
    ]

    it("can read, upload, rename, move, favorite, tag, share files", () => {
      expect(can("editor", "files.read")).toBe(true)
      expect(can("editor", "files.upload")).toBe(true)
      expect(can("editor", "files.rename")).toBe(true)
      expect(can("editor", "files.move")).toBe(true)
      expect(can("editor", "files.copy")).toBe(true)
      expect(can("editor", "files.favorite")).toBe(true)
      expect(can("editor", "files.tag")).toBe(true)
      expect(can("editor", "files.share")).toBe(true)
    })

    it("can create, rename, move, share folders", () => {
      expect(can("editor", "folders.read")).toBe(true)
      expect(can("editor", "folders.create")).toBe(true)
      expect(can("editor", "folders.rename")).toBe(true)
      expect(can("editor", "folders.move")).toBe(true)
      expect(can("editor", "folders.share")).toBe(true)
    })

    it("can manage shares", () => {
      expect(can("editor", "shares.read")).toBe(true)
      expect(can("editor", "shares.create")).toBe(true)
      expect(can("editor", "shares.update")).toBe(true)
      expect(can("editor", "shares.revoke")).toBe(true)
    })

    it("cannot delete files/folders, manage users, billing, audit, or workspace", () => {
      for (const permission of editorDenied) {
        expect(can("editor", permission)).toBe(false)
      }
    })

    it("matches the defined editor permission set", () => {
      for (const permission of editorAllowed) {
        expect(can("editor", permission)).toBe(true)
      }
    })
  })

  describe("viewer", () => {
    it("can only read", () => {
      expect(can("viewer", "files.read")).toBe(true)
      expect(can("viewer", "folders.read")).toBe(true)
      expect(can("viewer", "shares.read")).toBe(true)
    })

    it("cannot write or modify anything", () => {
      const writePermissions: Permission[] = [
        "files.upload",
        "files.rename",
        "files.move",
        "files.copy",
        "files.delete",
        "files.restore",
        "files.favorite",
        "files.tag",
        "files.share",
        "folders.create",
        "folders.rename",
        "folders.move",
        "folders.delete",
        "folders.share",
        "shares.create",
        "shares.update",
        "shares.revoke",
      ]

      for (const permission of writePermissions) {
        expect(can("viewer", permission)).toBe(false)
      }
    })

    it("cannot access admin features", () => {
      expect(can("viewer", "users.invite")).toBe(false)
      expect(can("viewer", "users.read")).toBe(false)
      expect(can("viewer", "billing.read")).toBe(false)
      expect(can("viewer", "analytics.read")).toBe(false)
      expect(can("viewer", "audit.read")).toBe(false)
      expect(can("viewer", "workspace.settings.read")).toBe(false)
      expect(can("viewer", "workspace.delete")).toBe(false)
      expect(can("viewer", "workspace.transfer")).toBe(false)
    })
  })

  describe("ownership override", () => {
    const userId = "user-123"
    const otherId = "user-456"

    it("owner of a file can delete it even if role doesn't allow (editor+delete)", () => {
      expect(can("editor", "files.delete", userId, userId)).toBe(true)
    })

    it("owner of a file can restore it even if role doesn't allow (editor+restore)", () => {
      expect(can("editor", "files.restore", userId, userId)).toBe(true)
    })

    it("owner of a folder can delete it even if role doesn't allow (editor+folder.delete)", () => {
      expect(can("editor", "folders.delete", userId, userId)).toBe(true)
    })

    it("non-owner cannot use ownership override", () => {
      expect(can("editor", "files.delete", userId, otherId)).toBe(false)
    })

    it("viewer cannot use ownership override", () => {
      expect(can("viewer", "files.delete", userId, userId)).toBe(false)
    })

    it("ownership override does not grant unrelated permissions", () => {
      expect(can("editor", "users.invite", userId, userId)).toBe(false)
      expect(can("editor", "billing.read", userId, userId)).toBe(false)
      expect(can("editor", "analytics.read", userId, userId)).toBe(false)
    })

    it("owner role still has full access (ownership override is irrelevant)", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(can("owner", permission)).toBe(true)
        expect(can("owner", permission, userId, userId)).toBe(true)
      }
    })
  })

  describe("every role", () => {
    it("has a defined permission set", () => {
      for (const role of roles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined()
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0)
      }
    })
  })
})
