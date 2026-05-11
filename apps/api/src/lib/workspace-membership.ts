import { and, eq, inArray } from "drizzle-orm"
import type { getDB } from "./db"
import { member, organization, user, workspace, workspaceMember } from "@bucketdrive/shared/db/schema"
import type { WorkspaceRole } from "@bucketdrive/shared"

type DB = ReturnType<typeof getDB>

const WORKSPACE_ROLES: readonly WorkspaceRole[] = ["owner", "admin", "editor", "viewer"]

export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  const firstRole = role?.split(",")[0]?.trim()
  return WORKSPACE_ROLES.includes(firstRole as WorkspaceRole)
    ? (firstRole as WorkspaceRole)
    : "viewer"
}

export async function ensureOrganizationForWorkspace(db: DB, workspaceId: string) {
  const currentWorkspace = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .get()

  if (!currentWorkspace) {
    return null
  }

  const existingOrganization = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, workspaceId))
    .get()

  if (!existingOrganization) {
    await db
      .insert(organization)
      .values({
        id: currentWorkspace.id,
        name: currentWorkspace.name,
        slug: currentWorkspace.slug,
        logo: null,
        metadata: JSON.stringify({ workspaceId: currentWorkspace.id }),
        createdAt: currentWorkspace.createdAt,
      })
      .run()
  }

  return currentWorkspace
}

export async function syncWorkspaceMemberships(db: DB, workspaceId: string) {
  const currentWorkspace = await ensureOrganizationForWorkspace(db, workspaceId)
  if (!currentWorkspace) {
    return
  }

  const [legacyMembers, authUsers, existingMembers] = await Promise.all([
    db.select().from(workspaceMember).where(eq(workspaceMember.workspaceId, workspaceId)).all(),
    db.select({ id: user.id }).from(user).all(),
    db.select().from(member).where(eq(member.organizationId, workspaceId)).all(),
  ])

  const existingUserIds = new Set(authUsers.map((row) => row.id))
  const membersByUserId = new Map(existingMembers.map((row) => [row.userId, row]))

  for (const legacyMember of legacyMembers) {
    if (!existingUserIds.has(legacyMember.userId)) {
      continue
    }

    const existingMember = membersByUserId.get(legacyMember.userId)
    if (!existingMember) {
      const createdMember = {
        id: crypto.randomUUID(),
        organizationId: workspaceId,
        userId: legacyMember.userId,
        role: legacyMember.role,
        createdAt: legacyMember.createdAt,
      }

      await db.insert(member).values(createdMember).run()
      membersByUserId.set(legacyMember.userId, createdMember)
      continue
    }

    if (normalizeWorkspaceRole(existingMember.role) !== normalizeWorkspaceRole(legacyMember.role)) {
      await db
        .update(member)
        .set({ role: legacyMember.role })
        .where(eq(member.id, existingMember.id))
        .run()
      membersByUserId.set(legacyMember.userId, { ...existingMember, role: legacyMember.role })
    }
  }

  if (existingUserIds.has(currentWorkspace.ownerId) && !membersByUserId.has(currentWorkspace.ownerId)) {
    const createdAt = new Date().toISOString()
    const ownerMember = {
      id: crypto.randomUUID(),
      organizationId: workspaceId,
      userId: currentWorkspace.ownerId,
      role: "owner",
      createdAt,
    }

    await db.insert(member).values(ownerMember).run()
    membersByUserId.set(currentWorkspace.ownerId, ownerMember)

    const legacyOwner = await db
      .select({ id: workspaceMember.id })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, currentWorkspace.ownerId),
        ),
      )
      .get()

    if (!legacyOwner) {
      await db
        .insert(workspaceMember)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          userId: currentWorkspace.ownerId,
          role: "owner",
          createdAt,
        })
        .run()
    }
  }
}

export async function getWorkspaceRoleForUser(
  db: DB,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  await syncWorkspaceMemberships(db, workspaceId)

  const currentMember = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, workspaceId), eq(member.userId, userId)))
    .get()

  if (currentMember) {
    return normalizeWorkspaceRole(currentMember.role)
  }

  return null
}

export async function listWorkspaceMembershipsForUser(db: DB, userId: string) {
  const legacyMemberships = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(eq(workspaceMember.userId, userId))
    .all()

  const workspaceIds = [...new Set(legacyMemberships.map((row) => row.workspaceId))]
  for (const workspaceId of workspaceIds) {
    await syncWorkspaceMemberships(db, workspaceId)
  }

  return db
    .select({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ownerId: workspace.ownerId,
      storageQuotaBytes: workspace.storageQuotaBytes,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      role: member.role,
    })
    .from(member)
    .innerJoin(workspace, eq(workspace.id, member.organizationId))
    .where(eq(member.userId, userId))
    .all()
}

export async function listWorkspaceMembersWithUsers(db: DB, workspaceId: string) {
  await syncWorkspaceMemberships(db, workspaceId)

  const rows = await db
    .select({
      id: member.id,
      userId: member.userId,
      workspaceId: member.organizationId,
      role: member.role,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, workspaceId))
    .all()

  return rows.map((row) => ({
    ...row,
    role: normalizeWorkspaceRole(row.role),
  }))
}

export async function syncMemberToLegacyWorkspaceMember(
  db: DB,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  const existing = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, userId)))
    .get()

  if (existing) {
    await db.update(workspaceMember).set({ role }).where(eq(workspaceMember.id, existing.id)).run()
    return
  }

  await db
    .insert(workspaceMember)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    })
    .run()
}

export async function removeLegacyWorkspaceMember(db: DB, workspaceId: string, userId: string) {
  await db
    .delete(workspaceMember)
    .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, userId)))
    .run()
}

export async function getUsersByEmails(db: DB, emails: string[]) {
  if (emails.length === 0) {
    return []
  }

  return db
    .select()
    .from(user)
    .where(inArray(user.email, emails))
    .all()
}
