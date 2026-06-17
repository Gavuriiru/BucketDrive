export function formatBytes(bytes: number, locale = "en-US"): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 B`

  const units = ["B", "KB", "MB", "GB", "TB"] as const
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: index === 0 ? 0 : 1,
  }).format(value)

  return `${formatted} ${String(units[index])}`
}

export function formatRelativeDate(
  value: string,
  labels: { today: string; yesterday: string; daysAgo: (days: number) => string; unknown: string },
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return labels.unknown

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return date.toLocaleDateString()
  if (days === 0) return labels.today
  if (days === 1) return labels.yesterday
  if (days < 7) return labels.daysAgo(days)

  return date.toLocaleDateString()
}

export function formatShortDate(
  value: string,
  options: { locale: string; unknown: string },
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return options.unknown

  return date.toLocaleDateString(options.locale, { month: "short", day: "numeric" })
}

export function formatPercent(value: number, total: number, locale = "en-US"): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return new Intl.NumberFormat(locale, { style: "percent" }).format(0)
  }

  return new Intl.NumberFormat(locale, { style: "percent" }).format(value / total)
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "\uD83D\uDDBC"
  if (mimeType.startsWith("video/")) return "\uD83C\uDFAC"
  if (mimeType.startsWith("audio/")) return "\uD83C\uDFB5"
  if (mimeType.includes("pdf")) return "\uD83D\uDCC4"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "\uD83D\uDCCA"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "\uD83D\uDCBD"
  if (mimeType.startsWith("text/")) return "\uD83D\uDCDD"

  return "\uD83D\uDCC1"
}
