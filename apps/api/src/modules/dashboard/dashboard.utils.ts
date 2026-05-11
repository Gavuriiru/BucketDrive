export interface StorageTrendFile {
  sizeBytes: number
  createdAt: string
  deletedAt: string | null
}

export interface StorageTrendPoint {
  date: string
  usedBytes: number
}

export function buildStorageTrend(
  files: StorageTrendFile[],
  days = 7,
  now = new Date(),
): StorageTrendPoint[] {
  const points: StorageTrendPoint[] = []
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today)
    day.setDate(today.getDate() - index)
    const dayEnd = day.getTime()

    const usedBytes = files.reduce((total, file) => {
      const createdAt = new Date(file.createdAt).getTime()
      const deletedAt = file.deletedAt ? new Date(file.deletedAt).getTime() : Number.POSITIVE_INFINITY

      if (createdAt <= dayEnd && deletedAt > dayEnd) {
        return total + file.sizeBytes
      }

      return total
    }, 0)

    points.push({
      date: day.toISOString().slice(0, 10),
      usedBytes,
    })
  }

  return points
}

export function parseAllowedMimeTypes(raw: string | null | undefined): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((entry): entry is string => typeof entry === "string")
  } catch {
    return []
  }
}
