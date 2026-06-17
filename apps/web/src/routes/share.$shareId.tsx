/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-deprecated, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { useState, useCallback, useEffect } from "react"
import { useParams } from "@tanstack/react-router"
import {
  FolderOpen,
  Download,
  Lock,
  LockKeyhole,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  FileText,
  X,
} from "lucide-react"
import {
  useShareInfo,
  useAccessShare,
  useShareBrowseQuery,
  downloadShareFile,
  previewShareFile,
  type ShareInfoData,
  type ShareAccessResult,
  type ShareBrowseResult,
  type ShareFilePreviewResult,
} from "@/lib/api"
import { ApiRequestError } from "@/lib/api"
import { DEFAULT_BRAND_NAME } from "@/lib/branding"
import { useI18n } from "@/lib/i18n"

type SharedFile = ShareBrowseResult["files"][number]

export function ShareAccessPage() {
  const { t } = useI18n()
  const params = useParams({ from: "/share/$shareId" })
  const shareId = params.shareId

  const { data: info, isLoading, isError, error } = useShareInfo(shareId)
  const [password, setPassword] = useState("")
  const [submittedPassword, setSubmittedPassword] = useState<string | null>(null)
  const [accessData, setAccessData] = useState<ShareAccessResult | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)

  const accessMutation = useAccessShare(shareId)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [browsePassword, setBrowsePassword] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null)
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)
  const folderShareAccessGranted =
    info?.resourceType === "folder" && (!info.hasPassword || submittedPassword !== null)
  const browseQuery = useShareBrowseQuery(
    shareId,
    currentFolderId,
    browsePassword,
    folderShareAccessGranted,
  )

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
          setCurrentFolderId(null)
        }
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setAccessError(err.message)
        } else {
          setAccessError(t("share.error.unexpected"))
        }
      }
    },
    [password, accessMutation],
  )

  const handleBrowse = useCallback((folderId: string | null) => {
    setAccessError(null)
    setCurrentFolderId(folderId)
  }, [])

  useEffect(() => {
    if (!(browseQuery.error instanceof ApiRequestError)) {
      return
    }
    const message = browseQuery.error.message
    if (accessError !== message) {
      setAccessError(message)
    }
  }, [accessError, browseQuery.error])

  const handleDownloadSharedFile = useCallback(
    async (fileId: string) => {
      try {
        setAccessError(null)
        setDownloadingFileId(fileId)
        const result = await downloadShareFile(shareId, fileId, browsePassword || undefined)
        const link = document.createElement("a")
        link.href = result.signedUrl
        link.download = result.fileName
        link.target = "_blank"
        link.rel = "noreferrer"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setAccessError(err.message)
        } else {
          setAccessError(t("share.error.downloadFailed"))
        }
      } finally {
        setDownloadingFileId(null)
      }
    },
    [browsePassword, shareId],
  )

  const loadSharedPreview = useCallback(
    async (fileId: string): Promise<ShareFilePreviewResult> => {
      const result = await previewShareFile(shareId, fileId, browsePassword || undefined)
      return result
    },
    [browsePassword, shareId],
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
        <p className="text-text-tertiary text-sm">{t("share.error.notFound")}</p>
      </div>
    )
  }

  if (!info.isActive) {
    return (
      <ShareErrorFrame
        icon={<LockKeyhole className="text-error h-8 w-8" />}
        title={t("share.error.revoked.title")}
        message={t("share.error.revoked.description")}
      />
    )
  }

  if (info.expiresAt && new Date(info.expiresAt) < new Date()) {
    return (
      <ShareErrorFrame
        icon={<LockKeyhole className="text-error h-8 w-8" />}
        title={t("share.error.expired.title")}
        message={t("share.error.expired.description")}
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

    if (!info.hasPassword && browseQuery.isLoading && !browseQuery.data && !accessError) {
      return (
        <div className="bg-bg-primary flex min-h-screen items-center justify-center">
          <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      )
    }

    return (
      <>
        <ShareExternalExplorer
          info={info}
          browseData={
            browseQuery.data ?? {
              resourceName: info.resourceName,
              currentFolderId: null,
              breadcrumbs: [],
              files: [],
              folders: [],
              brandingLogoUrl: info.brandingLogoUrl,
              brandingName: info.brandingName,
            }
          }
          isFetching={browseQuery.isFetching}
          onBrowse={handleBrowse}
          onPreview={setPreviewFile}
          onDownload={handleDownloadSharedFile}
          downloadingFileId={downloadingFileId}
          isDownloading={downloadingFileId !== null}
          error={accessError}
        />
        {previewFile && (
          <SharePublicFilePreview
            file={previewFile}
            loadPreview={loadSharedPreview}
            onClose={() => setPreviewFile(null)}
            onDownload={handleDownloadSharedFile}
          />
        )}
      </>
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
      <p className="text-text-tertiary text-sm">{t("share.access.loading")}</p>
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
  const { t } = useI18n()
  if (error instanceof ApiRequestError) {
    if (error.code === "SHARE_REVOKED") {
      return (
        <ShareErrorFrame
          icon={<LockKeyhole className="text-error h-8 w-8" />}
          title={t("share.error.revoked.title")}
          message={t("share.error.revoked.descriptionShort")}
        />
      )
    }
    if (error.code === "SHARE_EXPIRED") {
      return (
        <ShareErrorFrame
          icon={<LockKeyhole className="text-error h-8 w-8" />}
          title={t("share.error.expired.title")}
          message={t("share.error.expired.description")}
        />
      )
    }
    if (error.code === "SHARE_LOCKED") {
      return (
        <ShareErrorFrame
          icon={<Lock className="text-warning h-8 w-8" />}
          title={t("share.error.locked.title")}
          message={error.message}
        />
      )
    }
    return (
      <ShareErrorFrame
        icon={<AlertTriangle className="text-error h-8 w-8" />}
        title={t("share.error.notFound.title")}
        message={error.message}
      />
    )
  }
  return (
    <ShareErrorFrame
      icon={<AlertTriangle className="text-error h-8 w-8" />}
      title={t("share.error.notFound.title")}
      message={t("share.error.notFound.description")}
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
  const { t } = useI18n()
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
            {t("share.access.directLinkDescription", { resourceType })}
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-accent w-full rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? t("share.access.loading") : t("share.access.button")}
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
              {t("share.password.label")}
            </label>
            <div className="relative">
              <Lock className="text-text-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                id="password"
                data-testid="share-password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder={t("share.password.placeholder")}
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
            {isLoading ? t("share.password.verifying") : t("share.password.button")}
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
  const { t } = useI18n()
  return (
    <main className="bg-bg-primary flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="bg-success/10 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Download className="text-success h-8 w-8" />
      </div>
      <div className="text-center">
        <h1 className="text-text-primary text-xl font-semibold">{resourceName}</h1>
        <p className="text-text-secondary mt-2 text-sm">
          {t("share.direct.sharedVia")}{" "}
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
        {t("share.direct.downloadButton")}
      </a>
      {info.expiresAt && (
        <p className="text-text-tertiary text-xs">
          {t("share.direct.expiresLabel")} {new Date(info.expiresAt).toLocaleString()}
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
  isFetching,
  onBrowse,
  onPreview,
  onDownload,
  downloadingFileId,
  isDownloading,
  error,
}: {
  info: ShareInfoData
  browseData: ShareBrowseResult
  isFetching: boolean
  onBrowse: (folderId: string | null) => void
  onPreview: (file: SharedFile) => void
  onDownload: (fileId: string) => void
  downloadingFileId: string | null
  isDownloading: boolean
  error: string | null
}) {
  const { t } = useI18n()
  const isAtRoot = browseData.breadcrumbs.length <= 1

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
              <p className="text-text-tertiary text-xs">{t("share.explorer.sharedFolder")}</p>
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
          {!isAtRoot ? (
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

        {isFetching && (
          <div className="mb-3 flex items-center gap-2">
            <div className="border-accent h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-text-tertiary text-xs">{t("share.explorer.loadingFolder")}</span>
          </div>
        )}

        <div className="border-border-default flex-1 overflow-hidden rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="border-border-muted bg-surface-default border-b">
                <th className="text-text-tertiary px-4 py-2.5 text-left text-xs font-medium">
                  {t("share.explorer.column.name")}
                </th>
                <th className="text-text-tertiary hidden px-4 py-2.5 text-left text-xs font-medium sm:table-cell">
                  {t("share.explorer.column.type")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!isFetching && browseData.folders.length === 0 && browseData.files.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-text-tertiary px-4 py-8 text-center text-sm">
                    {t("share.explorer.emptyFolder")}
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
                      {t("share.explorer.type.folder")}
                    </span>
                  </td>
                </tr>
              ))}
              {browseData.files.map((file) => (
                <tr
                  key={file.id}
                  className="border-border-muted hover:bg-surface-hover cursor-pointer border-b transition-colors last:border-b-0"
                  onClick={() => onPreview(file)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-lg">{fileIcon}</span>
                        <div className="min-w-0">
                          <p className="text-text-primary truncate text-sm font-medium">
                            {file.name}
                          </p>
                          <p className="text-text-tertiary text-xs">
                            {formatFileSize(file.sizeBytes)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDownload(file.id)
                        }}
                        disabled={isDownloading && downloadingFileId === file.id}
                        className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary inline-flex rounded-md p-1.5 transition-colors disabled:opacity-50 sm:hidden"
                        aria-label={t("share.explorer.downloadAriaLabel", { name: file.name })}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    <div className="flex items-center justify-between gap-3">
                      <span className="bg-surface-hover text-text-secondary rounded-full px-2 py-0.5 text-xs">
                        {file.mimeType.split("/")[0] ?? t("share.explorer.type.file")}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDownload(file.id)
                        }}
                        disabled={isDownloading && downloadingFileId === file.id}
                        className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary inline-flex rounded-md p-1.5 transition-colors disabled:opacity-50"
                        aria-label={t("share.explorer.downloadAriaLabel", { name: file.name })}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
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

function getPreviewType(
  mimeType: string,
): "image" | "video" | "audio" | "pdf" | "markdown" | "text" | "unknown" {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") return "markdown"
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "text/csv"
  ) {
    return "text"
  }
  return "unknown"
}

function ShareTextPreview({ url, mimeType }: { url: string; mimeType: string }) {
  const { t } = useI18n()
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setContent(null)
    setError(false)
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-error text-sm">{t("preview.error.textLoadFailed")}</p>
      </div>
    )
  }

  if (content === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  const isMarkdown = mimeType === "text/markdown" || mimeType === "text/x-markdown"
  if (!isMarkdown) {
    return (
      <div className="h-full overflow-auto p-4">
        <pre className="text-text-primary font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="text-text-primary space-y-2 text-sm leading-relaxed">
        {content.split("\n").map((line, index) => {
          if (line.startsWith("### ")) {
            return (
              <h3 key={index} className="pt-3 text-lg font-semibold">
                {line.slice(4)}
              </h3>
            )
          }
          if (line.startsWith("## ")) {
            return (
              <h2 key={index} className="pt-4 text-xl font-semibold">
                {line.slice(3)}
              </h2>
            )
          }
          if (line.startsWith("# ")) {
            return (
              <h1 key={index} className="pt-5 text-2xl font-bold">
                {line.slice(2)}
              </h1>
            )
          }
          if (!line.trim()) return <div key={index} className="h-2" />
          return (
            <p key={index} className="break-words whitespace-pre-wrap">
              {line}
            </p>
          )
        })}
      </div>
    </div>
  )
}

function SharePublicFilePreview({
  file,
  loadPreview,
  onClose,
  onDownload,
}: {
  file: SharedFile
  loadPreview: (fileId: string) => Promise<ShareFilePreviewResult>
  onClose: () => void
  onDownload: (fileId: string) => void
}) {
  const { t } = useI18n()
  const [previewData, setPreviewData] = useState<ShareFilePreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewType = getPreviewType(file.mimeType)

  useEffect(() => {
    let cancelled = false
    setPreviewData(null)
    setError(null)
    loadPreview(file.id)
      .then((result) => {
        if (!cancelled) setPreviewData(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("preview.error.loadFailed"))
        }
      })
    return () => {
      cancelled = true
    }
  }, [file.id, loadPreview])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <p className="text-error text-sm">{error}</p>
        </div>
      )
    }

    if (!previewData) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      )
    }

    const url = previewData.signedUrl
    if (previewType === "image") {
      return (
        <div className="flex h-full items-center justify-center bg-black/5 p-4 dark:bg-white/5">
          <img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />
        </div>
      )
    }
    if (previewType === "video") {
      return (
        <div className="flex h-full items-center justify-center bg-black p-4">
          <video controls className="max-h-full max-w-full">
            <source src={url} />
          </video>
        </div>
      )
    }
    if (previewType === "audio") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
          <FileText className="text-accent h-12 w-12" />
          <p className="text-text-primary text-sm font-medium">{file.name}</p>
          <audio controls className="w-full max-w-md">
            <source src={url} />
          </audio>
        </div>
      )
    }
    if (previewType === "pdf") {
      return <iframe src={url} title={t("preview.pdf.title")} className="h-full w-full border-0" />
    }
    if (previewType === "text" || previewType === "markdown") {
      return <ShareTextPreview url={url} mimeType={file.mimeType} />
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <FileText className="text-text-tertiary h-14 w-14" />
        <div className="text-center">
          <p className="text-text-primary text-sm font-medium">{file.name}</p>
          <p className="text-text-tertiary mt-1 text-xs">{file.mimeType}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="bg-surface-default fixed inset-y-0 right-0 z-50 flex w-full flex-col shadow-2xl md:w-[480px]">
        <div className="border-border-default flex items-center gap-3 border-b px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary rounded-md p-1.5 transition-colors"
            aria-label={t("preview.closeAriaLabel")}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-text-primary truncate text-sm font-medium">{file.name}</p>
            <p className="text-text-tertiary text-[11px]">
              {file.mimeType} &middot; {formatFileSize(file.sizeBytes)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDownload(file.id)}
            className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary rounded-md p-1.5 transition-colors"
            aria-label={t("preview.downloadAriaLabel")}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </div>
    </>
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
