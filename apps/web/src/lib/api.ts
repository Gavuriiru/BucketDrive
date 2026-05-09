import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query"
import type { FileObject, Folder } from "@bucketdrive/shared"

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

interface ListFoldersResponse {
  data: Folder[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface BreadcrumbItem {
  id: string | null
  name: string
}

export interface UseFilesOptions {
  folderId?: string | null
  sort?: "name" | "created_at" | "size" | "type"
  order?: "asc" | "desc"
  page?: number
  limit?: number
}

export function useFiles(
  workspaceId: string | null,
  options?: UseFilesOptions,
): UseQueryResult<ListFilesResponse> {
  return useQuery<ListFilesResponse>({
    queryKey: ["files", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()
      if (options?.folderId) params.set("folderId", options.folderId)
      if (options?.sort) params.set("sort", options.sort)
      if (options?.order) params.set("order", options.order)
      if (options?.page) params.set("page", String(options.page))
      if (options?.limit) params.set("limit", String(options.limit))
      const qs = params.toString()
      return api.get<ListFilesResponse>(
        `/api/workspaces/${workspaceId}/files${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: !!workspaceId,
  })
}

export function useFolders(
  workspaceId: string | null,
  parentFolderId?: string | null,
): UseQueryResult<ListFoldersResponse> {
  return useQuery<ListFoldersResponse>({
    queryKey: ["folders", workspaceId, parentFolderId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (parentFolderId) params.set("parentFolderId", parentFolderId)
      const qs = params.toString()
      return api.get<ListFoldersResponse>(
        `/api/workspaces/${workspaceId}/folders${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: !!workspaceId,
  })
}

export function useBreadcrumbs(
  workspaceId: string | null,
  folderId: string | null,
) {
  return useQuery<BreadcrumbItem[]>({
    queryKey: ["breadcrumbs", workspaceId, folderId],
    queryFn: () =>
      api.get<BreadcrumbItem[]>(
        `/api/workspaces/${workspaceId}/folders/${folderId}/breadcrumbs`,
      ),
    enabled: !!workspaceId && !!folderId,
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

interface RenameFileResponse {
  id: string
  originalName: string
  extension: string | null
  updatedAt: string
}

export function useRenameFile(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileId, name }: { fileId: string; name: string }) =>
      api.patch<RenameFileResponse>(
        `/api/workspaces/${workspaceId}/files/${fileId}`,
        { name },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
    },
  })
}

interface DeleteFileResponse {
  success: true
  fileId: string
}

export function useDeleteFile(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileId }: { fileId: string }) =>
      api.delete<DeleteFileResponse>(
        `/api/workspaces/${workspaceId}/files/${fileId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
    },
  })
}

export type {
  FileObject,
  Folder,
  ListFilesResponse,
  ListFoldersResponse,
  BreadcrumbItem,
  InitiateUploadRequest,
  InitiateUploadResponse,
  CompleteUploadRequest as CompleteUploadPayload,
  DownloadUrlResponse,
  WorkspaceData,
}
