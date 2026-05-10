export interface TagColorOption {
  value: string
  label: string
  chipClassName: string
  swatchClassName: string
}

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  {
    value: "#ef4444",
    label: "Red",
    chipClassName: "bg-red-500 text-white",
    swatchClassName: "bg-red-500",
  },
  {
    value: "#f97316",
    label: "Orange",
    chipClassName: "bg-orange-500 text-white",
    swatchClassName: "bg-orange-500",
  },
  {
    value: "#eab308",
    label: "Yellow",
    chipClassName: "bg-yellow-500 text-black",
    swatchClassName: "bg-yellow-500",
  },
  {
    value: "#22c55e",
    label: "Green",
    chipClassName: "bg-green-500 text-white",
    swatchClassName: "bg-green-500",
  },
  {
    value: "#3b82f6",
    label: "Blue",
    chipClassName: "bg-blue-500 text-white",
    swatchClassName: "bg-blue-500",
  },
  {
    value: "#8b5cf6",
    label: "Violet",
    chipClassName: "bg-violet-500 text-white",
    swatchClassName: "bg-violet-500",
  },
  {
    value: "#ec4899",
    label: "Pink",
    chipClassName: "bg-pink-500 text-white",
    swatchClassName: "bg-pink-500",
  },
  {
    value: "#6b7280",
    label: "Neutral",
    chipClassName: "bg-slate-500 text-white",
    swatchClassName: "bg-slate-500",
  },
]

const FALLBACK_TAG_COLOR = {
  value: "#6b7280",
  label: "Neutral",
  chipClassName: "bg-slate-500 text-white",
  swatchClassName: "bg-slate-500",
} satisfies TagColorOption

export function getTagColorClasses(color: string) {
  return (
    TAG_COLOR_OPTIONS.find((option) => option.value.toLowerCase() === color.toLowerCase()) ??
    FALLBACK_TAG_COLOR
  )
}
