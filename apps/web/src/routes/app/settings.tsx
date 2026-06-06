/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { useEffect, useState, type ReactNode } from "react"
import { useCurrentWorkspace } from "@/hooks/use-current-workspace"
import {
  useDashboardSettings,
  useUpdateDashboardSettings,
  useUploadBucketBrandingLogo,
} from "@/lib/api"
import { Image, Upload } from "lucide-react"

export function SettingsPage() {
  const { workspace, workspaceId, isLoading: workspacesLoading } = useCurrentWorkspace()
  const settingsQuery = useDashboardSettings(workspaceId)
  const updateSettings = useUpdateDashboardSettings(workspaceId)
  const uploadBrandingLogo = useUploadBucketBrandingLogo(workspaceId)

  const [quotaGb, setQuotaGb] = useState("10")
  const [maxFileSizeMb, setMaxFileSizeMb] = useState("5120")
  const [chunkSizeMb, setChunkSizeMb] = useState("5")
  const [defaultShareExpirationDays, setDefaultShareExpirationDays] = useState("30")
  const [trashRetentionDays, setTrashRetentionDays] = useState("30")
  const [enablePublicSignup, setEnablePublicSignup] = useState(false)
  const [allowedMimeTypes, setAllowedMimeTypes] = useState("")
  const [brandingName, setBrandingName] = useState("")
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("")
  const [r2PublicBaseUrl, setR2PublicBaseUrl] = useState("")

  useEffect(() => {
    const settings = settingsQuery.data
    if (!settings) return

    setQuotaGb(String(settings.storageQuotaBytes / (1024 * 1024 * 1024)))
    setMaxFileSizeMb(String(settings.maxFileSizeBytes / (1024 * 1024)))
    setChunkSizeMb(String(settings.uploadChunkSizeBytes / (1024 * 1024)))
    setDefaultShareExpirationDays(String(settings.defaultShareExpirationDays))
    setTrashRetentionDays(String(settings.trashRetentionDays))
    setEnablePublicSignup(settings.enablePublicSignup)
    setAllowedMimeTypes(settings.allowedMimeTypes.join(", "))
    setBrandingName(settings.brandingName ?? "")
    setBrandingLogoUrl(settings.brandingLogoUrl ?? "")
    setR2PublicBaseUrl(settings.r2PublicBaseUrl ?? "")
  }, [settingsQuery.data])

  if (workspacesLoading || settingsQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-text-tertiary text-sm">No bucket found</p>
      </div>
    )
  }

  const settings = settingsQuery.data
  if (!settings) {
    return null
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-text-primary text-2xl font-semibold">Bucket Settings</h1>
        <p className="text-text-secondary mt-2 text-sm">
          Update quota, upload policy, retention, branding, and public signup behavior.
        </p>
      </div>

      <form
        className="border-border-default bg-surface-default grid gap-6 rounded-2xl border p-6"
        onSubmit={(event) => {
          event.preventDefault()
          updateSettings.mutate({
            ...settings,
            storageQuotaBytes: Math.max(Number(quotaGb) || 0, 1) * 1024 * 1024 * 1024,
            maxFileSizeBytes: Math.max(Number(maxFileSizeMb) || 0, 1) * 1024 * 1024,
            uploadChunkSizeBytes: Math.max(Number(chunkSizeMb) || 0, 1) * 1024 * 1024,
            defaultShareExpirationDays: Math.max(Number(defaultShareExpirationDays) || 1, 1),
            trashRetentionDays: Math.max(Number(trashRetentionDays) || 1, 1),
            enablePublicSignup,
            allowedMimeTypes: allowedMimeTypes
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
            brandingName: brandingName.trim() || null,
            brandingLogoUrl: brandingLogoUrl.trim() || null,
            r2PublicBaseUrl: r2PublicBaseUrl.trim().replace(/\/+$/, "") || null,
          })
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Storage quota (GB)">
            <input
              value={quotaGb}
              onChange={(event) => setQuotaGb(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Max file size (MB)">
            <input
              value={maxFileSizeMb}
              onChange={(event) => setMaxFileSizeMb(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Upload chunk size (MB)">
            <input
              value={chunkSizeMb}
              onChange={(event) => setChunkSizeMb(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Default share expiration (days)">
            <input
              value={defaultShareExpirationDays}
              onChange={(event) => setDefaultShareExpirationDays(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Trash retention (days)">
            <input
              value={trashRetentionDays}
              onChange={(event) => setTrashRetentionDays(event.target.value)}
              className={inputClasses}
            />
          </Field>
        </div>

        <Field label="Allowed MIME types">
          <textarea
            value={allowedMimeTypes}
            onChange={(event) => setAllowedMimeTypes(event.target.value)}
            rows={4}
            placeholder="image/png, application/pdf"
            className={`${inputClasses} resize-none`}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Branding name">
            <input
              value={brandingName}
              onChange={(event) => setBrandingName(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Branding logo">
            <label className="border-border-muted bg-bg-tertiary hover:bg-surface-hover flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors">
              <span className="flex min-w-0 items-center gap-3">
                <span className="bg-surface-default flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  {settings.brandingLogoAssetUrl || brandingLogoUrl ? (
                    <img
                      src={settings.brandingLogoAssetUrl ?? brandingLogoUrl}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <Image className="text-text-tertiary h-5 w-5" />
                  )}
                </span>
                <span className="text-text-secondary truncate text-sm">
                  {uploadBrandingLogo.isPending ? "Uploading..." : "Upload image"}
                </span>
              </span>
              <Upload className="text-accent h-4 w-4 shrink-0" />
              <input
                type="file"
                accept="image/*"
                disabled={uploadBrandingLogo.isPending}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) uploadBrandingLogo.mutate({ file })
                  event.target.value = ""
                }}
              />
            </label>
          </Field>
          <Field label="External logo URL">
            <input
              value={brandingLogoUrl}
              onChange={(event) => setBrandingLogoUrl(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="R2 public domain">
            <input
              value={r2PublicBaseUrl}
              onChange={(event) => setR2PublicBaseUrl(event.target.value)}
              placeholder="https://files.example.com"
              className={inputClasses}
            />
          </Field>
        </div>

        <label className="border-border-muted bg-bg-tertiary text-text-primary flex items-center gap-3 rounded-xl border px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={enablePublicSignup}
            onChange={(event) => setEnablePublicSignup(event.target.checked)}
            className="accent-accent h-4 w-4"
          />
          Enable public signup for this bucket
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-text-tertiary text-xs">
            Size inputs are entered as GB/MB and converted to bytes on save.
          </p>
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="bg-accent rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateSettings.isPending ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>

      {(settingsQuery.isError || updateSettings.isError || uploadBrandingLogo.isError) && (
        <div className="border-error/40 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm">
          {settingsQuery.error?.message ??
            updateSettings.error?.message ??
            uploadBrandingLogo.error?.message}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-text-primary text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

const inputClasses =
  "rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
