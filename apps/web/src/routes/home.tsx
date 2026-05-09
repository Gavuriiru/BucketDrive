import { Link } from "@tanstack/react-router"
import { FolderOpen, Upload } from "lucide-react"

export function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
      <FolderOpen className="h-16 w-16 text-text-tertiary" />
      <h1 className="text-3xl font-semibold text-text-primary">BucketDrive</h1>
      <p className="text-text-secondary">
        Your cloud storage, beautifully organized.
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
