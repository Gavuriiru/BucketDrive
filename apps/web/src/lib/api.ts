import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query"
import type { FileObject } from "@bucketdrive/shared"

interface ApiError {
  code: string
  message: string
}

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    })

    const data = (await res.json()) as T | ApiError

    if (!res.ok) {
      const err = data as ApiError
      throw new ApiRequestError(err.code ?? "UNKNOWN", err.message ?? "Request failed", res.status)
    }

    return data as T
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url)
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: "DELETE" })
  }
}

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "ApiRequestError"
  }
}

export const api = new ApiClient()

interface ListFilesResponse {
  data: FileObject[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface InitiateUploadRequest {
  fileName: string
  mimeType: string
  sizeBytes: number
  folderId?: string | null
  checksum?: string
}

interface InitiateUploadResponse {
  uploadId: string
  signedUrl: string
  expiresAt: string
  storageKey: string
}

interface CompleteUploadRequest {
  uploadId: string
  fileName: string
  mimeType: string
  folderId?: string | null
  parts?: Array<{ partNumber: number; etag: string; sizeBytes: number }>
}

interface DownloadUrlResponse {
  signedUrl: string
  expiresAt: string
  fileName: string
}

export function useFiles(
  workspaceId: string | null,
  options?: { folderId?: string | null },
): UseQueryResult<ListFilesResponse> {
  return useQuery<ListFilesResponse>({
    queryKey: ["files", workspaceId, options?.folderId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (options?.folderId) params.set("folderId", options.folderId)
      const qs = params.toString()
      return api.get<ListFilesResponse>(
        `/api/workspaces/${workspaceId}/files${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: !!workspaceId,
  })
}

export function useInitiateUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      ...body
    }: InitiateUploadRequest & { workspaceId: string }) =>
      api.post<InitiateUploadResponse>(`/api/workspaces/${workspaceId}/files/upload`, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["files", variables.workspaceId] })
    },
  })
}

export function useCompleteUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      ...body
    }: CompleteUploadRequest & { workspaceId: string }) =>
      api.post<FileObject>(
        `/api/workspaces/${workspaceId}/files/upload/complete`,
        body,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["files", data.workspaceId] })
    },
  })
}

export function useDownloadUrl(workspaceId: string | null, fileId: string | null) {
  return useQuery({
    queryKey: ["download", workspaceId, fileId],
    queryFn: () =>
      api.get<DownloadUrlResponse>(
        `/api/workspaces/${workspaceId}/files/${fileId}/download`,
      ),
    enabled: !!workspaceId && !!fileId,
  })
}

interface WorkspaceData {
  id: string
  name: string
  slug: string
  ownerId: string
  storageQuotaBytes: number
  createdAt: string
  updatedAt: string
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<{ data: WorkspaceData[] }>("/api/workspaces"),
  })
}

export type {
  FileObject,
  ListFilesResponse,
  InitiateUploadRequest,
  InitiateUploadResponse,
  CompleteUploadRequest as CompleteUploadPayload,
  DownloadUrlResponse,
  WorkspaceData,
}
