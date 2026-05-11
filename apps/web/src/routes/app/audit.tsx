/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions */
import { useState } from "react"
import { useDashboardAudit, useWorkspaces } from "@/lib/api"

export function AuditPage() {
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces()
  const workspace = workspacesData?.data?.[0] ?? null
  const workspaceId = workspace?.id ?? null
  const [action, setAction] = useState("")
  const [resourceType, setResourceType] = useState("")

  const auditQuery = useDashboardAudit(workspaceId, {
    action: action.trim() || undefined,
    resourceType: resourceType || undefined,
    page: 1,
    limit: 50,
  })

  if (workspacesLoading || auditQuery.isLoading) {
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

  const items = auditQuery.data?.data ?? []

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Audit Log</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Filter activity by action and resource type. Results are newest first.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-5 md:flex-row">
        <input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Filter by action, e.g. member.removed"
          className="flex-1 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <select
          value={resourceType}
          onChange={(event) => setResourceType(event.target.value)}
          className="rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          <option value="">All resources</option>
          <option value="file">file</option>
          <option value="folder">folder</option>
          <option value="member">member</option>
          <option value="workspace">workspace</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-default">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-muted bg-bg-tertiary">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border-muted last:border-b-0 hover:bg-surface-hover"
              >
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{item.action}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.actorName ?? item.actorId}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.resourceType}
                  {item.resourceId ? ` • ${item.resourceId}` : ""}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            No audit entries match the current filters.
          </div>
        )}
      </div>

      {auditQuery.isError && (
        <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {auditQuery.error.message}
        </div>
      )}
    </div>
  )
}
