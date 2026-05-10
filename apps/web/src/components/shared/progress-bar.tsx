interface ProgressBarProps {
  value: number
  className?: string
  size?: "sm" | "md"
}

export function ProgressBar({ value, className = "", size = "sm" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const height = size === "sm" ? "h-1" : "h-2"

  return (
    <div className={`w-full overflow-hidden rounded-full bg-surface-hover ${height} ${className}`}>
      <div
        className={`h-full rounded-full bg-accent transition-all duration-300 ease-out ${clamped < 100 ? "animate-pulse" : ""}`}
        style={{ width: `${String(clamped)}%` }}
      />
    </div>
  )
}

export function ProgressCircle({ value, size = 24 }: { value: number; size?: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-surface-hover"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-accent transition-all duration-300"
        transform={`rotate(-90 ${String(size / 2)} ${String(size / 2)})`}
      />
    </svg>
  )
}
