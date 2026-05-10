import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query"
import type {
  FileObject,
  Folder,
  ShareDashboardItem,
  ShareLink,
  SharesListScope,
  WorkspaceRole,
} from "@bucketdrive/shared"

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
  role: WorkspaceRole
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

interface FolderResponse {
  id: string
  workspaceId: string
  parentFolderId: string | null
  name: string
  path: string
  createdBy: string
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

interface DeleteFolderResponse {
  success: true
  folderId: string
}

export function useCreateFolder(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, parentFolderId }: { name: string; parentFolderId?: string | null }) =>
      api.post<FolderResponse>(
        `/api/workspaces/${workspaceId}/folders`,
        { name, parentFolderId: parentFolderId ?? null },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
    },
  })
}

export function useUpdateFolder(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      name,
      parentFolderId,
    }: {
      folderId: string
      name?: string
      parentFolderId?: string | null
    }) =>
      api.patch<FolderResponse>(
        `/api/workspaces/${workspaceId}/folders/${folderId}`,
        { name, parentFolderId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
    },
  })
}

export function useDeleteFolder(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ folderId }: { folderId: string }) =>
      api.delete<DeleteFolderResponse>(
        `/api/workspaces/${workspaceId}/folders/${folderId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
    },
  })
}

interface UpdateFileResponse {
  id: string
  originalName: string
  extension: string | null
  folderId: string | null
  updatedAt: string
}

export function useMoveFile(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: string; folderId: string | null }) =>
      api.patch<UpdateFileResponse>(
        `/api/workspaces/${workspaceId}/files/${fileId}`,
        { folderId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
    },
  })
}

interface ListSharesResponse {
  data: ShareDashboardItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    scope: SharesListScope
    currentUserRole: WorkspaceRole
    canManageAll: boolean
  }
}

interface CreateShareRequest {
  resourceId: string
  resourceType: "file" | "folder"
  shareType: "internal" | "external_direct" | "external_explorer"
  password?: string
  expiresAt?: string
  permissions?: ("read" | "download")[]
}

interface UpdateShareRequest {
  password?: string | null
  expiresAt?: string | null
  isActive?: boolean
}

export function useShares(
  workspaceId: string | null,
  options?: { scope?: SharesListScope; page?: number; limit?: number; enabled?: boolean },
): UseQueryResult<ListSharesResponse> {
  return useQuery<ListSharesResponse>({
    queryKey: ["shares", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()
      if (options?.scope) params.set("scope", options.scope)
      if (options?.page) params.set("page", String(options.page))
      if (options?.limit) params.set("limit", String(options.limit))
      const qs = params.toString()
      return api.get<ListSharesResponse>(
        `/api/workspaces/${workspaceId}/shares${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: !!workspaceId && options?.enabled !== false,
  })
}

export function useCreateShare(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateShareRequest) =>
      api.post<ShareLink>(`/api/workspaces/${workspaceId}/shares`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

export function useUpdateShare(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shareId, ...body }: UpdateShareRequest & { shareId: string }) =>
      api.patch<ShareLink>(`/api/workspaces/${workspaceId}/shares/${shareId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

export function useDeleteShare(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shareId }: { shareId: string }) =>
      api.delete<{ success: boolean; shareId: string }>(
        `/api/workspaces/${workspaceId}/shares/${shareId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

interface ShareInfoData {
  id: string
  resourceType: "file" | "folder"
  resourceName: string
  shareType: "internal" | "external_direct" | "external_explorer"
  hasPassword: boolean
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

interface ShareAccessResult {
  resourceType: "file" | "folder"
  resourceName: string
  signedUrl?: string
  files?: Array<{ id: string; name: string; mimeType: string; sizeBytes: number }>
  folders?: Array<{ id: string; name: string }>
}

interface ShareBrowseResult {
  resourceName: string
  currentFolderId: string | null
  breadcrumbs: Array<{ id: string; name: string }>
  files: Array<{ id: string; name: string; mimeType: string; sizeBytes: number }>
  folders: Array<{ id: string; name: string }>
}

export function useShareInfo(shareId: string | null): UseQueryResult<ShareInfoData> {
  return useQuery<ShareInfoData>({
    queryKey: ["shareInfo", shareId],
    queryFn: () => api.get<ShareInfoData>(`/api/shares/${shareId}`),
    enabled: !!shareId,
    retry: (failureCount, error) => {
      const status = (error as { status?: number }).status
      if (status === 404 || status === 410 || status === 423) return false
      return failureCount < 3
    },
  })
}

export function useAccessShare(shareId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: { password?: string }) =>
      api.post<ShareAccessResult>(`/api/shares/${shareId}/access`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareInfo", shareId] })
    },
  })
}

export function useBrowseShare(shareId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { folderId?: string; password: string }) =>
      api.get<ShareBrowseResult>(
        `/api/shares/${shareId}/browse?folderId=${params.folderId ?? ""}&password=${encodeURIComponent(params.password)}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareBrowse", shareId] })
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
  ShareLink,
  CreateShareRequest,
  ListSharesResponse,
  ShareInfoData,
  ShareAccessResult,
  ShareBrowseResult,
}
