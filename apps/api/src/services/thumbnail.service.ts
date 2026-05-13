import { PhotonImage, resize, SamplingFilter } from "@cf-wasm/photon/workerd"
import { eq } from "drizzle-orm"
import { fileObject } from "@bucketdrive/shared"
import { getDB } from "../lib/db"

export interface ThumbnailServiceDeps {
  storage: R2Bucket
}

export class ThumbnailService {
  private readonly MAX_DIMENSION = 256
  private readonly MAX_SOURCE_BYTES = 20 * 1024 * 1024 // 20 MB

  constructor(private deps: ThumbnailServiceDeps) {}

  async generate(params: {
    fileId: string
    workspaceId: string
    storageKey: string
    mimeType: string
  }): Promise<void> {
    if (!this.isImage(params.mimeType)) {
      return
    }

    try {
      const object = await this.deps.storage.get(params.storageKey)
      if (!object) {
        console.warn(`Thumbnail: source object not found for key ${params.storageKey}`)
        return
      }

      const sourceBytes = new Uint8Array(await object.arrayBuffer())
      if (sourceBytes.byteLength > this.MAX_SOURCE_BYTES) {
        console.warn(`Thumbnail: skipping image > ${String(this.MAX_SOURCE_BYTES)} bytes`)
        return
      }

      const inputImage = PhotonImage.new_from_byteslice(sourceBytes)
      const width = inputImage.get_width()
      const height = inputImage.get_height()

      let targetWidth = width
      let targetHeight = height

      if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
        const ratio = Math.min(
          this.MAX_DIMENSION / width,
          this.MAX_DIMENSION / height,
        )
        targetWidth = Math.round(width * ratio)
        targetHeight = Math.round(height * ratio)
      }

      const outputImage = resize(
        inputImage,
        targetWidth,
        targetHeight,
        SamplingFilter.Lanczos3,
      )

      const thumbnailBytes = outputImage.get_bytes_webp()

      inputImage.free()
      outputImage.free()

      const thumbnailKey = `workspace/${params.workspaceId}/thumbnails/${params.fileId}.webp`

      await this.deps.storage.put(thumbnailKey, thumbnailBytes, {
        httpMetadata: { contentType: "image/webp" },
      })

      const db = getDB()
      await db
        .update(fileObject)
        .set({
          thumbnailKey,
          metadata: JSON.stringify({
            width,
            height,
            thumbnailWidth: targetWidth,
            thumbnailHeight: targetHeight,
          }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(fileObject.id, params.fileId))
        .run()

      console.warn(`Thumbnail generated for ${params.fileId}: ${thumbnailKey}`)
    } catch (err) {
      console.warn(`Thumbnail generation failed for ${params.fileId}:`, err)
      // Thumbnail failures are non-critical; do not throw
    }
  }

  async uploadVideoFrame(params: {
    fileId: string
    workspaceId: string
    blob: Blob
  }): Promise<void> {
    try {
      const bytes = new Uint8Array(await params.blob.arrayBuffer())
      const thumbnailKey = `workspace/${params.workspaceId}/thumbnails/${params.fileId}.webp`

      await this.deps.storage.put(thumbnailKey, bytes, {
        httpMetadata: { contentType: "image/webp" },
      })

      const db = getDB()
      await db
        .update(fileObject)
        .set({
          thumbnailKey,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(fileObject.id, params.fileId))
        .run()
    } catch (err) {
      console.warn(`Video thumbnail upload failed for ${params.fileId}:`, err)
    }
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/")
  }
}
