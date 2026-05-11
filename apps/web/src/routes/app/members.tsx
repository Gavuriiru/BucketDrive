/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions */
import { useState } from "react"
import {
  useAddMember,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
  useWorkspaces,
} from "@/lib/api"
import type { WorkspaceRole } from "@bucketdrive/shared"

const editableRoles: WorkspaceRole[] = ["owner", "admin", "editor", "viewer"]
const inviteRoles: Array<Exclude<WorkspaceRole, "owner">> = ["admin", "editor", "viewer"]

export function MembersPage() {
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces()
  const workspace = workspacesData?.data?.[0] ?? null
  const workspaceId = workspace?.id ?? null
  const membersQuery = useMembers(workspaceId)
  const addMember = useAddMember(workspaceId)
  const updateMemberRole = useUpdateMemberRole(workspaceId)
  const removeMember = useRemoveMember(workspaceId)

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Exclude<WorkspaceRole, "owner">>("editor")

  if (workspacesLoading || membersQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-text-tertiary">No workspace found</p>
      </div>
    )
  }

  const members = membersQuery.data?.data ?? []

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Members</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Add existing users by email, update roles, and remove access when needed.
        </p>
      </div>

      <div className="rounded-2xl border border-border-default bg-surface-default p-5">
        <h2 className="text-base font-semibold text-text-primary">Add Member</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          This first pass only supports direct-add for users who already have an account.
        </p>

        <form
          className="mt-4 flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (!email.trim()) return
            addMember.mutate(
              { email: email.trim(), role },
              {
                onSuccess: () => {
                  setEmail("")
                  setRole("editor")
                },
              },
            )
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@company.com"
            className="flex-1 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Exclude<WorkspaceRole, "owner">)}
            className="rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {inviteRoles.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addMember.isPending}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addMember.isPending ? "Adding..." : "Add member"}
          </button>
        </form>

        {addMember.isError && (
          <p className="mt-3 text-sm text-error">{addMember.error.message}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-default">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-muted bg-bg-tertiary">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">Role</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border-muted last:border-b-0 hover:bg-surface-hover"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {entry.image ? (
                      <img src={entry.image} alt={entry.name} className="h-9 w-9 rounded-full" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-text-primary">{entry.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{entry.email}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={entry.role}
                    onChange={(event) =>
                      updateMemberRole.mutate({
                        memberId: entry.id,
                        role: event.target.value as WorkspaceRole,
                      })
                    }
                    className="rounded-lg border border-border-default bg-bg-tertiary px-3 py-2 text-sm capitalize text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    {editableRoles.map((availableRole) => (
                      <option key={availableRole} value={availableRole}>
                        {availableRole}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      const confirmed = window.confirm(`Remove ${entry.name} from this workspace?`)
                      if (confirmed) {
                        removeMember.mutate({ memberId: entry.id })
                      }
                    }}
                    className="rounded-lg border border-error/40 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/10"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            No members found.
          </div>
        )}
      </div>

      {(membersQuery.isError || updateMemberRole.isError || removeMember.isError) && (
        <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {membersQuery.error?.message ??
            updateMemberRole.error?.message ??
            removeMember.error?.message}
        </div>
      )}
    </div>
  )
}
