import { Hono } from "hono"
import { and, eq, gte } from "drizzle-orm"
import {
  AcceptInvitationResponse,
  CreateInvitationRequest,
  InvitationDetailResponse,
  InvitationListItemSchema,
  ListInvitationsResponse,
  RevokeInvitationResponse,
  type WorkspaceRole,
} from "@bucketdrive/shared"
import { auditLog, bucketInvitation, user } from "@bucketdrive/shared/db/schema"
import { authMiddleware } from "../../middleware/auth"
import { requirePermission } from "../../middleware/rbac"
import { getDB } from "../../lib/db"

interface InvitationsEnv {
  DB: D1Database
  APP_URL?: string
}

interface InvitationsVariables {
  user: { id: string; email: string; name: string }
  session: { id: string; userId: string; expiresAt: Date }
}

const invitations = new Hono<{ Bindings: InvitationsEnv; Variables: InvitationsVariables }>()
const publicInvitations = new Hono<{ Bindings: InvitationsEnv; Variables: InvitationsVariables }>()

invitations.use("*", authMiddleware)

function inviteLink(appUrl: string | undefined, token: string) {
  const base = appUrl?.replace(/\/$/, "") ?? ""
  return `${base}/join?token=${token}`
}

invitations.get("/", requirePermission("users.invite"), async (c) => {
  const db = getDB()
  const rows = await db
    .select({
      id: bucketInvitation.id,
      email: bucketInvitation.email,
      role: bucketInvitation.role,
      invitedBy: bucketInvitation.invitedBy,
      status: bucketInvitation.status,
      expiresAt: bucketInvitation.expiresAt,
      createdAt: bucketInvitation.createdAt,
    })
    .from(bucketInvitation)
    .where(
      and(
        eq(bucketInvitation.status, "pending"),
        gte(bucketInvitation.expiresAt, new Date().toISOString()),
      ),
    )
    .all()
  const users = await db.select({ id: user.id, name: user.name }).from(user).all()
  const userNameById = new Map(users.map((row) => [row.id, row.name]))
  const data = rows.map((row) =>
    InvitationListItemSchema.parse({
      ...row,
      invitedByName: userNameById.get(row.invitedBy) ?? "Unknown",
    }),
  )
  return c.json(
    ListInvitationsResponse.parse({
      data,
      meta: {
        page: 1,
        limit: data.length || 1,
        total: data.length,
        totalPages: data.length > 0 ? 1 : 0,
      },
    }),
  )
})

invitations.post("/", requirePermission("users.invite"), async (c) => {
  const actor = c.get("user")
  const db = getDB()
  const body = CreateInvitationRequest.parse(await c.req.json())
  const targetUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, body.email.toLowerCase()))
    .get()
  if (targetUser)
    return c.json({ code: "USER_ALREADY_MEMBER", message: "User already exists" }, 409)
  const existing = await db
    .select({ id: bucketInvitation.id })
    .from(bucketInvitation)
    .where(
      and(
        eq(bucketInvitation.email, body.email.toLowerCase()),
        eq(bucketInvitation.status, "pending"),
      ),
    )
    .get()
  if (existing)
    return c.json(
      { code: "CONFLICT", message: "Pending invitation already exists for this email" },
      409,
    )
  const now = new Date()
  const token = crypto.randomUUID()
  const created = {
    id: crypto.randomUUID(),
    email: body.email.toLowerCase(),
    token,
    role: body.role,
    invitedBy: actor.id,
    status: "pending",
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  await db.insert(bucketInvitation).values(created).run()
  await writeAudit(db, actor.id, "member.invited", created.id, {
    email: body.email,
    role: body.role,
  })
  return c.json(
    { ...created, invitedByName: actor.name, inviteLink: inviteLink(c.env.APP_URL, token) },
    201,
  )
})

invitations.delete("/:invitationId", requirePermission("users.invite"), async (c) => {
  const actor = c.get("user")
  const db = getDB()
  const invitationId = c.req.param("invitationId")
  const target = await db
    .select()
    .from(bucketInvitation)
    .where(eq(bucketInvitation.id, invitationId))
    .get()
  if (!target) return c.json({ code: "NOT_FOUND", message: "Invitation not found" }, 404)
  await db
    .update(bucketInvitation)
    .set({ status: "revoked", updatedAt: new Date().toISOString() })
    .where(eq(bucketInvitation.id, invitationId))
    .run()
  await writeAudit(db, actor.id, "member.invitation_revoked", invitationId, {
    email: target.email,
    role: target.role,
  })
  return c.json(RevokeInvitationResponse.parse({ success: true, invitationId }))
})

publicInvitations.get("/:token", async (c) => {
  const db = getDB()
  const token = c.req.param("token")
  const invite = await db
    .select()
    .from(bucketInvitation)
    .where(eq(bucketInvitation.token, token))
    .get()
  if (!invite) return c.json({ code: "NOT_FOUND", message: "Invitation not found" }, 404)
  const inviter = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, invite.invitedBy))
    .get()
  return c.json(
    InvitationDetailResponse.parse({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      invitedByName: inviter?.name ?? "Unknown",
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    }),
  )
})

publicInvitations.post("/:token/accept", authMiddleware, async (c) => {
  const db = getDB()
  const currentUser = c.get("user")
  const token = c.req.param("token")
  const now = new Date().toISOString()
  const invite = await db
    .select()
    .from(bucketInvitation)
    .where(and(eq(bucketInvitation.token, token), eq(bucketInvitation.status, "pending")))
    .get()
  if (!invite)
    return c.json({ code: "NOT_FOUND", message: "Invitation not found or already used" }, 404)
  if (invite.expiresAt < now) {
    await db
      .update(bucketInvitation)
      .set({ status: "expired", updatedAt: now })
      .where(eq(bucketInvitation.id, invite.id))
      .run()
    return c.json({ code: "SHARE_EXPIRED", message: "Invitation has expired" }, 410)
  }
  if (invite.email.toLowerCase() !== currentUser.email.toLowerCase()) {
    return c.json(
      { code: "FORBIDDEN", message: "This invitation is for a different email address" },
      403,
    )
  }
  await db
    .update(user)
    .set({ role: invite.role, updatedAt: now })
    .where(eq(user.id, currentUser.id))
    .run()
  await db
    .update(bucketInvitation)
    .set({ status: "accepted", acceptedAt: now, updatedAt: now })
    .where(eq(bucketInvitation.id, invite.id))
    .run()
  await writeAudit(db, currentUser.id, "member.joined", currentUser.id, { role: invite.role })
  return c.json(
    AcceptInvitationResponse.parse({ success: true, role: invite.role as WorkspaceRole }),
  )
})

async function writeAudit(
  db: ReturnType<typeof getDB>,
  actorId: string,
  action: string,
  resourceId: string,
  metadata: Record<string, unknown>,
) {
  await db
    .insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      actorId,
      action,
      resourceType: "member",
      resourceId,
      metadata: JSON.stringify(metadata),
      createdAt: new Date().toISOString(),
    })
    .run()
}

export const invitationsHandler = invitations
export const publicInvitationsHandler = publicInvitations
