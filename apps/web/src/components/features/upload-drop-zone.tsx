import { useCallback, useState, type DragEvent } from "react"
import { Upload } from "lucide-react"

interface UploadDropZoneProps {
  onFilesDrop: (files: File[]) => void
  className?: string
}

export function UploadDropZone({ onFilesDrop, className = "" }: UploadDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onFilesDrop(files)
      }
    },
    [onFilesDrop],
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${isDragging ? "scale-[1.02] border-accent bg-accent/10" : "border-border-default hover:border-border-strong"} ${className}`}
    >
      <div className="pointer-events-none flex flex-col items-center justify-center gap-3 py-12">
        <div
          className={`rounded-full p-4 transition-colors ${isDragging ? "bg-accent/20 text-accent" : "bg-surface-hover text-text-tertiary"}`}
        >
          <Upload className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">
            {isDragging ? "Drop files to upload" : "Drag files here to upload"}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">or click the Upload button</p>
        </div>
      </div>
    </div>
  )
}
