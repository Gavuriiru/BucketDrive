import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  AcceptInvitationResponse,
  InvitationDetailResponse,
  ListInvitationsResponse,
  RevokeInvitationResponse,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("invitations contracts", () => {
  it("lists, creates, reads, accepts, and revokes invitations", async () => {
    const ctx = createContractTestContext()
    const invitee = ctx.seedUser({
      email: "contract-invitee@example.com",
      name: "Invitee",
      role: null,
    })

    const create = await ctx.request(`/api/workspaces/${ctx.workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email: invitee.email, role: "viewer" }),
    })
    expect(create.status).toBe(201)
    const created = InvitationDetailResponse.extend({ inviteLink: z.string() }).parse(await ctx.json(create))

    const list = await ctx.request(`/api/workspaces/${ctx.workspaceId}/invitations`)
    expect(list.status).toBe(200)
    ListInvitationsResponse.parse(await ctx.json(list))

    const token = new URL(created.inviteLink, "http://localhost:5173").searchParams.get("token")
    expect(token).toBeTruthy()

    const detail = await ctx.request(`/api/invitations/${String(token)}`, { userId: null })
    expect(detail.status).toBe(200)
    InvitationDetailResponse.parse(await ctx.json(detail))

    const accept = await ctx.request(`/api/invitations/${String(token)}/accept`, {
      method: "POST",
      userId: invitee.id,
    })
    expect(accept.status).toBe(200)
    AcceptInvitationResponse.parse(await ctx.json(accept))

    const stale = ctx.seedInvitation({ email: "stale@example.com" })
    const revoke = await ctx.request(`/api/workspaces/${ctx.workspaceId}/invitations/${stale.id}`, {
      method: "DELETE",
    })
    expect(revoke.status).toBe(200)
    RevokeInvitationResponse.parse(await ctx.json(revoke))
  })

  it("enforces invitation RBAC and validation", async () => {
    const ctx = createContractTestContext()

    const denied = await ctx.request(`/api/workspaces/${ctx.workspaceId}/invitations`, {
      method: "POST",
      userId: ctx.viewer.id,
      body: JSON.stringify({ email: "denied@example.com", role: "viewer" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request(`/api/workspaces/${ctx.workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email: "bad", role: "viewer" }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
