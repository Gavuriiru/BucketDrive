import { AwsClient } from "aws4fetch"

export interface StorageProvider {
  generateSignedUploadUrl(key: string, expiresIn?: number): Promise<string>
  generateSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  copy(fromKey: string, toKey: string): Promise<void>
  createMultipartUpload(key: string): Promise<{ uploadId: string }>
  generateSignedUploadPartUrl(
    uploadId: string,
    partNumber: number,
    key: string,
    expiresIn?: number,
  ): Promise<string>
  completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<void>
  abortMultipartUpload(uploadId: string, key: string): Promise<void>
}

export class R2StorageProvider implements StorageProvider {
  private binding: R2Bucket
  private s3: AwsClient
  private bucketName: string
  private endpoint: string

  constructor(config: {
    binding: R2Bucket
    accessKeyId: string
    secretAccessKey: string
    endpoint: string
    bucketName?: string
  }) {
    this.binding = config.binding
    this.bucketName = config.bucketName ?? "bucketdrive-files"
    this.endpoint = config.endpoint.replace(/\/$/, "")
    this.s3 = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: "auto",
    })
  }

  async generateSignedUploadUrl(key: string, expiresIn = 900): Promise<string> {
    const url = new URL(`${this.endpoint}/${this.bucketName}/${key}`)
    const signed = await this.s3.sign(url.toString(), {
      method: "PUT",
      aws: { signQuery: true },
    })
    const signedUrl = new URL(signed.url)
    signedUrl.searchParams.set("X-Amz-Expires", String(expiresIn))
    return signedUrl.toString()
  }

  async generateSignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
    const url = new URL(`${this.endpoint}/${this.bucketName}/${key}`)
    const signed = await this.s3.sign(url.toString(), {
      method: "GET",
      aws: { signQuery: true },
    })
    const signedUrl = new URL(signed.url)
    signedUrl.searchParams.set("X-Amz-Expires", String(expiresIn))
    return signedUrl.toString()
  }

  async delete(key: string): Promise<void> {
    await this.binding.delete(key)
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const object = await this.binding.get(fromKey)
    if (!object) {
      throw new Error(`Source object not found: ${fromKey}`)
    }
    await this.binding.put(toKey, object.body)
  }

  async createMultipartUpload(key: string): Promise<{ uploadId: string }> {
    const multipart = await this.binding.createMultipartUpload(key)
    return { uploadId: multipart.uploadId }
  }

  async generateSignedUploadPartUrl(
    uploadId: string,
    partNumber: number,
    key: string,
    expiresIn = 900,
  ): Promise<string> {
    const url = new URL(`${this.endpoint}/${this.bucketName}/${key}`)
    url.searchParams.set("uploadId", uploadId)
    url.searchParams.set("partNumber", String(partNumber))

    const signed = await this.s3.sign(url.toString(), {
      method: "PUT",
      aws: { signQuery: true },
    })
    const signedUrl = new URL(signed.url)
    signedUrl.searchParams.set("X-Amz-Expires", String(expiresIn))
    return signedUrl.toString()
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<void> {
    const multipart = this.binding.resumeMultipartUpload(key, uploadId)
    await multipart.complete(
      parts.map((p) => ({ partNumber: p.partNumber, etag: p.etag })),
    )
  }

  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    const multipart = this.binding.resumeMultipartUpload(key, uploadId)
    await multipart.abort()
  }
}

export function createStorageProvider(env: {
  STORAGE: R2Bucket
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ENDPOINT?: string
}): StorageProvider {
  if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT) {
    return new R2StorageProvider({
      binding: env.STORAGE,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      endpoint: env.R2_ENDPOINT,
    })
  }

  return new R2BindingProvider(env.STORAGE)
}

class R2BindingProvider implements StorageProvider {
  constructor(private binding: R2Bucket) {}

  generateSignedUploadUrl(_key: string, _expiresIn?: number): Promise<string> {
    return Promise.reject(
      new Error(
        "Presigned URLs require R2 S3 credentials. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT in .dev.vars.",
      ),
    )
  }

  generateSignedDownloadUrl(_key: string, _expiresIn?: number): Promise<string> {
    return Promise.reject(
      new Error(
        "Presigned URLs require R2 S3 credentials. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT in .dev.vars.",
      ),
    )
  }

  async delete(key: string): Promise<void> {
    await this.binding.delete(key)
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const object = await this.binding.get(fromKey)
    if (!object) {
      throw new Error(`Source object not found: ${fromKey}`)
    }
    await this.binding.put(toKey, object.body)
  }

  async createMultipartUpload(key: string): Promise<{ uploadId: string }> {
    const multipart = await this.binding.createMultipartUpload(key)
    return { uploadId: multipart.uploadId }
  }

  generateSignedUploadPartUrl(): Promise<string> {
    return Promise.reject(
      new Error(
        "Presigned part URLs require R2 S3 credentials. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT in .dev.vars.",
      ),
    )
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<void> {
    const multipart = this.binding.resumeMultipartUpload(key, uploadId)
    await multipart.complete(
      parts.map((p) => ({ partNumber: p.partNumber, etag: p.etag })),
    )
  }

  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    const multipart = this.binding.resumeMultipartUpload(key, uploadId)
    await multipart.abort()
  }
}
