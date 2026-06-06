const MAX_BRANDING_ASSET_BYTES = 5 * 1024 * 1024

export async function readUploadedBrandingImage(request: Request): Promise<
  | File
  | {
      status: 400 | 413 | 415
      error: { code: string; message: string }
    }
> {
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return { status: 400, error: { code: "VALIDATION_ERROR", message: "Missing file upload" } }
  }
  if (!file.type.startsWith("image/")) {
    return {
      status: 415,
      error: { code: "BLOCKED_MIME", message: "Only image uploads are allowed" },
    }
  }
  if (file.size > MAX_BRANDING_ASSET_BYTES) {
    return {
      status: 413,
      error: { code: "FILE_TOO_LARGE", message: "Branding assets must be 5 MB or smaller" },
    }
  }
  return file
}

export function sanitizeAssetName(name: string): string {
  const sanitized = name.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-")
  return sanitized || "asset"
}
