/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { useThumbnailUrl } from "@/lib/api"

interface FileThumbnailProps {
  workspaceId: string
  fileId: string
  mimeType: string
  fallback: React.ReactNode
  className?: string
}

export function FileThumbnail({ workspaceId, fileId, mimeType, fallback, className }: FileThumbnailProps) {
  const { data, isLoading } = useThumbnailUrl(workspaceId, fileId)

  const isVisual = mimeType.startsWith("image/") || mimeType.startsWith("video/")
  if (!isVisual) return fallback

  if (isLoading) {
    return (
      <div className={`animate-pulse rounded-md bg-surface-hover ${className ?? ""}`}>
        {fallback}
      </div>
    )
  }

  if (!data?.signedUrl) return fallback

  return (
    <img
      src={data.signedUrl}
      alt=""
      className={`object-cover ${className ?? ""}`}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none"
      }}
    />
  )
}
