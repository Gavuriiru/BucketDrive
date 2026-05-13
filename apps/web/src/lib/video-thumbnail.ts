export async function extractVideoFrame(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("video/")) return null

  const video = document.createElement("video")
  video.src = URL.createObjectURL(file)
  video.muted = true
  video.playsInline = true

  return new Promise<Blob | null>((resolve) => {
    video.addEventListener("loadeddata", () => {
      const seekTime = Math.min(0.5, video.duration / 2)
      video.currentTime = seekTime
    })

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas")
      const maxDimension = 256
      const ratio = Math.min(maxDimension / video.videoWidth, maxDimension / video.videoHeight)
      canvas.width = Math.round(video.videoWidth * ratio)
      canvas.height = Math.round(video.videoHeight * ratio)

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(video.src)
        resolve(null)
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src)
          resolve(blob)
        },
        "image/webp",
        0.85,
      )
    })

    video.addEventListener("error", () => {
      URL.revokeObjectURL(video.src)
      resolve(null)
    })
  })
}
