import { describe, expect, it } from "vitest"
import {
  AcceptPlatformInvitationResponse,
  CreatePlatformInvitationResponse,
  ListPlatformInvitationsResponse,
  PlatformJoinResponse,
  PlatformSettingsResponse,
  UpdatePlatformSettingsResponse,
} from "@bucketdrive/shared"
import { createContractTestContext, expectApiError } from "./test-harness"

describe("platform contracts", () => {
  it("returns user info, updates settings, joins default workspace, and manages platform invitations", async () => {
    const ctx = createContractTestContext()
    const invitee = ctx.seedUser({ email: "platform-invitee@example.com", name: "Platform Invitee", role: null })

    const me = await ctx.request("/api/platform/me")
    expect(me.status).toBe(200)
    expect(await ctx.json(me)).toMatchObject({ id: ctx.owner.id, isPlatformAdmin: true })

    const settings = await ctx.request("/api/platform/settings", {
      method: "PATCH",
      body: JSON.stringify({ platformName: "BucketDrive Test" }),
    })
    expect(settings.status).toBe(200)
    UpdatePlatformSettingsResponse.parse(await ctx.json(settings))

    const readSettings = await ctx.request("/api/platform/settings", { userId: null })
    expect(readSettings.status).toBe(200)
    PlatformSettingsResponse.parse(await ctx.json(readSettings))

    const join = await ctx.request("/api/platform/join", { method: "POST", userId: ctx.outsider.id })
    expect(join.status).toBe(200)
    PlatformJoinResponse.parse(await ctx.json(join))

    const createInvite = await ctx.request("/api/platform/invitations", {
      method: "POST",
      body: JSON.stringify({ email: invitee.email, role: "viewer", canCreateWorkspaces: true }),
    })
    expect(createInvite.status).toBe(201)
    const invite = CreatePlatformInvitationResponse.parse(await ctx.json(createInvite))

    const list = await ctx.request("/api/platform/invitations")
    expect(list.status).toBe(200)
    ListPlatformInvitationsResponse.parse(await ctx.json(list))

    const token = new URL(invite.inviteLink, "http://localhost:5173").searchParams.get("token")
    const accept = await ctx.request(`/api/platform/invitations/${String(token)}/accept`, {
      method: "POST",
      userId: invitee.id,
    })
    expect(accept.status).toBe(200)
    AcceptPlatformInvitationResponse.parse(await ctx.json(accept))
  })

  it("denies platform admin routes to non-admins and validates payloads", async () => {
    const ctx = createContractTestContext()

    const denied = await ctx.request("/api/platform/settings", {
      method: "PATCH",
      userId: ctx.viewer.id,
      body: JSON.stringify({ platformName: "Denied" }),
    })
    expect(denied.status).toBe(403)
    expectApiError(await ctx.json(denied))

    const invalid = await ctx.request("/api/platform/settings", {
      method: "PATCH",
      body: JSON.stringify({ platformName: "" }),
    })
    expect(invalid.status).toBe(400)
    expectApiError(await ctx.json(invalid))
  })
})
