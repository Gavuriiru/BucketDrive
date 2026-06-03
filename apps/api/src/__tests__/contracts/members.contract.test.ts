import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  InvitationDetailResponse,
  ListMembersResponse,
  RemoveMemberResponse,
  WorkspaceMemberListItemSchema,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("members contracts", () => {
  it("lists members, creates invitations, updates roles, and removes members", async () => {
    const ctx = createContractTestContext()
    const target = ctx.seedUser({ email: "editor@example.com", name: "Editor", role: "editor" })

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/members`)
    expect(list.status).toBe(200)
    const members = ListMembersResponse.parse(await ctx.json(list))
    const targetMember = members.data.find((entry) => entry.userId === target.id)
    if (!targetMember) {
      throw new Error("Expected seeded member in list response")
    }

    const invite = await ctx.request(`/api/workspaces/${ctx.workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify({ email: "new-member@example.com", role: "viewer" }),
    })
    expect(invite.status).toBe(201)
    InvitationDetailResponse.extend({ inviteLink: z.string() }).parse(await ctx.json(invite))

    const update = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/members/${targetMember.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role: "manager" }),
      },
    )
    expect(update.status).toBe(200)
    WorkspaceMemberListItemSchema.parse(await ctx.json(update))

    const remove = await ctx.request(
      `/api/workspaces/${ctx.workspaceId}/members/${targetMember.id}`,
      {
        method: "DELETE",
      },
    )
    expect(remove.status).toBe(200)
    RemoveMemberResponse.parse(await ctx.json(remove))
  })

  it("enforces member RBAC and validation", async () => {
    const ctx = createContractTestContext()

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/members`, {
      method: "POST",
      userId: ctx.viewer.id,
      body: JSON.stringify({ email: "blocked@example.com", role: "viewer" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", role: "viewer" }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
