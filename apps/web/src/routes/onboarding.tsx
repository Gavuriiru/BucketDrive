import { Navigate } from "@tanstack/react-router"

export function OnboardingPage() {
  return (
    <Navigate to="/dashboard/files" search={{ folderId: undefined, previewFileId: undefined }} />
  )
}
