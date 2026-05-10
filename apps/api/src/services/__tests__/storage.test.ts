/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { R2StorageProvider, type StorageProvider } from "../storage"

vi.mock("aws4fetch", () => {
  const mockSign = vi.fn().mockImplementation((url: string) => {
    const signedUrl = new URL(url)
    signedUrl.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
    signedUrl.searchParams.set("X-Amz-Signature", "mock-signature")
    return Promise.resolve({ url: signedUrl.toString() })
  })

  return {
    AwsClient: vi.fn(function (this: Record<string, unknown>) {
      this.sign = mockSign
    } as unknown as new (...args: unknown[]) => { sign: typeof mockSign }),
  }
})

function createMockR2Bucket() {
  const store = new Map<string, ArrayBuffer>()

  return {
    store,
    put: vi.fn().mockImplementation(async (key: string, value: ArrayBuffer | ReadableStream | string) => {
      const buf = typeof value === "string"
        ? new TextEncoder().encode(value).buffer
        : value instanceof ReadableStream
          ? await new Response(value).arrayBuffer()
          : value

      store.set(key, buf)
      return { etag: `etag-${key}`, key, version: "1" }
    }),
    get: vi.fn().mockImplementation((key: string) => {
      const buf = store.get(key)
      if (!buf) return null
      return Promise.resolve({
        key,
        version: "1",
        size: buf.byteLength,
        etag: `etag-${key}`,
        httpEtag: `"etag-${key}"`,
        uploaded: new Date(),
        httpMetadata: {},
        customMetadata: {},
        range: () => ({ offset: 0, length: buf.byteLength }),
        writeHttpMetadata: () => {},
        body: new Uint8Array(buf),
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(buf),
        text: () => Promise.resolve(new TextDecoder().decode(buf)),
        json: () => Promise.resolve(JSON.parse(new TextDecoder().decode(buf)) as unknown),
        blob: () => Promise.resolve(new Blob([buf])),
      } as unknown as R2ObjectBody)
    }),
    delete: vi.fn().mockImplementation((_keys: string | string[]) => {
      const keys = Array.isArray(_keys) ? _keys : [_keys]
      for (const k of keys) store.delete(k)
      return Promise.resolve()
    }),
    head: vi.fn(),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
    list: vi.fn(),
  } as unknown as R2Bucket
}

describe("R2StorageProvider", () => {
  let provider: StorageProvider
  let mockBucket: ReturnType<typeof createMockR2Bucket>

  beforeEach(() => {
    mockBucket = createMockR2Bucket()
    provider = new R2StorageProvider({
      binding: mockBucket,
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      endpoint: "https://test.r2.cloudflarestorage.com",
      bucketName: "test-bucket",
    })
  })

  describe("generateSignedUploadUrl", () => {
    it("returns a signed URL for PUT", async () => {
      const url = await provider.generateSignedUploadUrl("workspace/ws1/files/test-file")
      expect(url).toContain("https://test.r2.cloudflarestorage.com/test-bucket/workspace/ws1/files/test-file")
      expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256")
      expect(url).toContain("X-Amz-Signature=mock-signature")
    })

    it("adds expiration to the URL", async () => {
      const url = await provider.generateSignedUploadUrl("key", 600)
      expect(url).toContain("X-Amz-Expires=600")
    })

    it("defaults to 15 min expiration", async () => {
      const url = await provider.generateSignedUploadUrl("key")
      expect(url).toContain("X-Amz-Expires=900")
    })
  })

  describe("generateSignedDownloadUrl", () => {
    it("returns a signed URL for GET", async () => {
      const url = await provider.generateSignedDownloadUrl("workspace/ws1/files/test-file")
      expect(url).toContain("https://test.r2.cloudflarestorage.com/test-bucket/workspace/ws1/files/test-file")
      expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256")
      expect(url).toContain("X-Amz-Signature=mock-signature")
    })
  })

  describe("delete", () => {
    it("calls R2 delete on the binding", async () => {
      await provider.delete("some-key")
      expect(mockBucket.delete).toHaveBeenCalledWith("some-key")
    })

    it("does not throw on non-existent key", async () => {
      await expect(provider.delete("nonexistent-key")).resolves.not.toThrow()
    })
  })

  describe("copy", () => {
    it("copies an object from one key to another", async () => {
      await mockBucket.put("source-key", "test content")
      await provider.copy("source-key", "dest-key")
      expect(mockBucket.put).toHaveBeenCalledWith("dest-key", expect.anything())
    })

    it("throws when source does not exist", async () => {
      await expect(provider.copy("missing-key", "dest-key")).rejects.toThrow(
        "Source object not found: missing-key",
      )
    })
  })
})
