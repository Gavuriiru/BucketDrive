/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-deprecated, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { useState, useCallback } from "react"
import { useParams } from "@tanstack/react-router"
import {
  FolderOpen,
  Download,
  Lock,
  LockKeyhole,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react"
import {
  useShareInfo,
  useAccessShare,
  useBrowseShare,
  type ShareInfoData,
  type ShareAccessResult,
  type ShareBrowseResult,
} from "@/lib/api"
import { ApiRequestError } from "@/lib/api"
import { DEFAULT_BRAND_NAME } from "@/lib/branding"

export function ShareAccessPage() {
  const params = useParams({ from: "/share/$shareId" })
  const shareId = params.shareId

  const { data: info, isLoading, isError, error } = useShareInfo(shareId)
  const [password, setPassword] = useState("")
  const [submittedPassword, setSubmittedPassword] = useState<string | null>(null)
  const [accessData, setAccessData] = useState<ShareAccessResult | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)

  const accessMutation = useAccessShare(shareId)
  const browseMutation = useBrowseShare(shareId)
  const [browseData, setBrowseData] = useState<ShareBrowseResult | null>(null)
  const [browsePassword, setBrowsePassword] = useState<string | null>(null)

  const handleAccess = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setAccessError(null)
      try {
        const result = await accessMutation.mutateAsync({ password: password || undefined })
        setAccessData(result)
        setSubmittedPassword(password)
        setBrowsePassword(password)
        if (result.resourceType === "folder") {
          setBrowseData({
            resourceName: result.resourceName,
            currentFolderId: null,
            breadcrumbs: [],
            files: result.files ?? [],
            folders: result.folders ?? [],
            brandingLogoUrl: result.brandingLogoUrl,
            brandingName: result.brandingName,
          })
        }
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setAccessError(err.message)
        } else {
          setAccessError("An unexpected error occurred")
        }
      }
    },
    [password, accessMutation],
  )

  const handleBrowse = useCallback(
    async (folderId: string | null) => {
      try {
        const result = await browseMutation.mutateAsync({
          folderId: folderId ?? undefined,
          password: browsePassword || undefined,
        })
        setBrowseData(result)
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setAccessError(err.message)
        }
      }
    },
    [browsePassword, browseMutation],
  )

  if (isLoading) {
    return (
      <div className="bg-bg-primary flex min-h-screen items-center justify-center">
        <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  if (isError) {
    return <ShareErrorState error={error} />
  }

  if (!info) {
    return (
      <div className="bg-bg-primary flex min-h-screen items-center justify-center">
        <p className="text-text-tertiary text-sm">Share not found</p>
      </div>
    )
  }

  if (!info.isActive) {
    return (
      <ShareErrorFrame
        icon={<LockKeyhole className="text-error h-8 w-8" />}
        title="Share revoked"
        message="This share link has been revoked and is no longer available."
      />
    )
  }

  if (info.expiresAt && new Date(info.expiresAt) < new Date()) {
    return (
      <ShareErrorFrame
        icon={<LockKeyhole className="text-error h-8 w-8" />}
        title="Share expired"
        message="This share link has expired."
      />
    )
  }

  if (info.hasPassword && !submittedPassword) {
    return (
      <SharePasswordForm
        resourceName={info.resourceName}
        resourceType={info.resourceType}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleAccess}
        isLoading={accessMutation.isPending}
        error={accessError}
        info={info}
      />
    )
  }

  if (accessData && accessData.signedUrl) {
    return (
      <ShareExternalDirect
        resourceName={accessData.resourceName}
        signedUrl={accessData.signedUrl}
        shareId={shareId}
        info={info}
      />
    )
  }

  if (accessData?.resourceType === "folder" || info.resourceType === "folder") {
    if (info.hasPassword && !accessData) {
      return (
        <SharePasswordForm
          resourceName={info.resourceName}
          resourceType={info.resourceType}
          password={password}
          onPasswordChange={setPassword}
          onSubmit={handleAccess}
          isLoading={accessMutation.isPending}
          error={accessError}
          info={info}
        />
      )
    }

    return (
      <ShareExternalExplorer
        info={info}
        browseData={
          browseData ?? {
            resourceName: info.resourceName,
            currentFolderId: null,
            breadcrumbs: [],
            files: [],
            folders: [],
            brandingLogoUrl: info.brandingLogoUrl,
            brandingName: info.brandingName,
          }
        }
        browseMutation={browseMutation}
        onBrowse={handleBrowse}
        accessPassword={browsePassword}
        error={accessError}
      />
    )
  }

  if (!info.hasPassword) {
    return (
      <SharePasswordForm
        resourceName={info.resourceName}
        resourceType={info.resourceType}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleAccess}
        isLoading={accessMutation.isPending}
        error={accessError}
        noPassword
        info={info}
      />
    )
  }

  return (
    <div className="bg-bg-primary flex min-h-screen items-center justify-center">
      <p className="text-text-tertiary text-sm">Loading share...</p>
    </div>
  )
}

function ShareErrorFrame({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode
  title: string
  message: string
}) {
  return (
    <div className="bg-bg-primary flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {icon}
      <div className="text-center">
        <h1 className="text-text-primary text-lg font-semibold">{title}</h1>
        <p className="text-text-secondary mt-1 text-sm">{message}</p>
      </div>
    </div>
  )
}

function ShareErrorState({ error }: { error: unknown }) {
  if (error instanceof ApiRequestError) {
    if (error.code === "SHARE_REVOKED") {
      return (
        <ShareErrorFrame
          icon={<LockKeyhole className="text-error h-8 w-8" />}
          title="Share revoked"
          message="This share link has been revoked."
        />
      )
    }
    if (error.code === "SHARE_EXPIRED") {
      return (
        <ShareErrorFrame
          icon={<LockKeyhole className="text-error h-8 w-8" />}
          title="Share expired"
          message="This share link has expired."
        />
      )
    }
    if (error.code === "SHARE_LOCKED") {
      return (
        <ShareErrorFrame
          icon={<Lock className="text-warning h-8 w-8" />}
          title="Share locked"
          message={error.message}
        />
      )
    }
    return (
      <ShareErrorFrame
        icon={<AlertTriangle className="text-error h-8 w-8" />}
        title="Not found"
        message={error.message}
      />
    )
  }
  return (
    <ShareErrorFrame
      icon={<AlertTriangle className="text-error h-8 w-8" />}
      title="Not found"
      message="This share link could not be found."
    />
  )
}

function SharePasswordForm({
  resourceName,
  resourceType,
  password,
  onPasswordChange,
  onSubmit,
  isLoading,
  error,
  noPassword,
  info,
}: {
  resourceName: string
  resourceType: "file" | "folder"
  password: string
  onPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  error: string | null
  noPassword?: boolean
  info?: ShareInfoData
}) {
  return (
    <main className="bg-bg-primary flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="bg-surface-hover flex h-16 w-16 items-center justify-center rounded-2xl">
        <FolderOpen className="text-accent h-8 w-8" />
      </div>
      <div className="text-center">
        <h1 className="text-text-primary text-xl font-semibold">{resourceName}</h1>
        <p className="text-text-secondary mt-1 text-sm">
          {info?.brandingName || DEFAULT_BRAND_NAME}
        </p>
      </div>

      {noPassword ? (
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <p className="text-text-tertiary text-center text-sm">
            This {resourceType} is shared via a direct link.
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-accent w-full rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Access shared content"}
          </button>
          {error && (
            <p className="bg-error/10 border-error/20 text-error rounded-lg border p-3 text-sm">
              {error}
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-text-secondary text-xs font-medium">
              Password required
            </label>
            <div className="relative">
              <Lock className="text-text-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                id="password"
                data-testid="share-password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Enter share password"
                autoFocus
                className="border-border-default bg-surface-default text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-accent w-full rounded-lg border py-2.5 pr-4 pl-10 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            data-testid="share-access"
            disabled={isLoading || password.length < 4}
            className="bg-accent w-full rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Access share"}
          </button>
          {error && (
            <p className="bg-error/10 border-error/20 text-error rounded-lg border p-3 text-sm">
              {error}
            </p>
          )}
        </form>
      )}
    </main>
  )
}

function ShareExternalDirect({
  resourceName,
  signedUrl,
  shareId: _shareId,
  info,
}: {
  resourceName: string
  signedUrl: string
  shareId: string
  info: ShareInfoData
}) {
  return (
    <main className="bg-bg-primary flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="bg-success/10 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Download className="text-success h-8 w-8" />
      </div>
      <div className="text-center">
        <h1 className="text-text-primary text-xl font-semibold">{resourceName}</h1>
        <p className="text-text-secondary mt-2 text-sm">
          This file has been shared with you via{" "}
          <span className="text-text-primary font-medium">
            {info.brandingName || DEFAULT_BRAND_NAME}
          </span>
        </p>
      </div>
      <a
        href={signedUrl}
        download={resourceName}
        data-testid="download-file"
        target="_blank"
        rel="noreferrer"
        className="bg-accent inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        <Download className="h-4 w-4" />
        Download file
      </a>
      {info.expiresAt && (
        <p className="text-text-tertiary text-xs">
          Link expires: {new Date(info.expiresAt).toLocaleString()}
        </p>
      )}
      <div className="bg-surface-hover flex h-8 items-center gap-1 rounded-full px-3">
        <FolderOpen className="text-text-tertiary h-3.5 w-3.5" />
        <span className="text-text-tertiary text-xs font-medium">
          {info.brandingName || DEFAULT_BRAND_NAME}
        </span>
      </div>
    </main>
  )
}

function ShareExternalExplorer({
  info,
  browseData,
  browseMutation,
  onBrowse,
  accessPassword: _accessPassword,
  error,
}: {
  info: ShareInfoData
  browseData: ShareBrowseResult
  browseMutation: ReturnType<typeof useBrowseShare>
  onBrowse: (folderId: string | null) => void
  accessPassword: string | null
  error: string | null
}) {
  return (
    <main className="bg-bg-primary flex min-h-screen flex-col">
      <header className="border-border-muted bg-bg-secondary border-b px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-surface-hover flex h-8 w-8 items-center justify-center rounded-lg">
              <FolderOpen className="text-accent h-4 w-4" />
            </div>
            <div>
              <h1 className="text-text-primary text-sm font-semibold">{info.resourceName}</h1>
              <p className="text-text-tertiary text-xs">Shared folder</p>
            </div>
          </div>
          {info.brandingName && (
            <div className="flex items-center gap-2">
              {info.brandingLogoUrl && (
                <img src={info.brandingLogoUrl} alt="" className="h-5 w-5 rounded object-contain" />
              )}
              <span className="text-text-secondary text-xs font-medium">{info.brandingName}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col p-4">
        <nav className="text-text-secondary mb-4 flex items-center gap-1 text-xs">
          {browseData.currentFolderId ? (
            <button
              onClick={() => onBrowse(null)}
              className="hover:bg-surface-hover flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="text-text-primary font-medium">{info.resourceName}</span>
            </button>
          ) : (
            <span className="text-text-primary px-1.5 py-0.5 font-medium">{info.resourceName}</span>
          )}
          {browseData.breadcrumbs.slice(1).map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="text-text-tertiary h-3 w-3" />
              <button
                onClick={() => onBrowse(crumb.id)}
                className="hover:bg-surface-hover rounded px-1.5 py-0.5 transition-colors"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        {error && (
          <div className="bg-error/10 border-error/20 mb-4 rounded-lg border p-3">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {browseMutation.isPending && (
          <div className="flex items-center justify-center py-12">
            <div className="border-accent h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        )}

        <div className="border-border-default flex-1 overflow-hidden rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="border-border-muted bg-surface-default border-b">
                <th className="text-text-tertiary px-4 py-2.5 text-left text-xs font-medium">
                  Name
                </th>
                <th className="text-text-tertiary hidden px-4 py-2.5 text-left text-xs font-medium sm:table-cell">
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {browseData.folders.length === 0 && browseData.files.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-text-tertiary px-4 py-8 text-center text-sm">
                    This folder is empty
                  </td>
                </tr>
              )}
              {browseData.folders.map((folder) => (
                <tr
                  key={folder.id}
                  className="border-border-muted hover:bg-surface-hover cursor-pointer border-b transition-colors last:border-b-0"
                  onClick={() => onBrowse(folder.id)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{folderIcon}</span>
                      <span className="text-text-primary text-sm font-medium">{folder.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    <span className="bg-surface-hover text-text-secondary rounded-full px-2 py-0.5 text-xs capitalize">
                      Folder
                    </span>
                  </td>
                </tr>
              ))}
              {browseData.files.map((file) => (
                <tr
                  key={file.id}
                  className="border-border-muted hover:bg-surface-hover border-b transition-colors last:border-b-0"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{fileIcon}</span>
                      <div>
                        <p className="text-text-primary truncate text-sm font-medium">
                          {file.name}
                        </p>
                        <p className="text-text-tertiary text-xs">
                          {formatFileSize(file.sizeBytes)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    <span className="bg-surface-hover text-text-secondary rounded-full px-2 py-0.5 text-xs">
                      {file.mimeType.split("/")[0] ?? "File"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

const folderIcon = "\uD83D\uDCC2"
const fileIcon = "\uD83D\uDCC4"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
