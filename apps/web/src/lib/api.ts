import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query"
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

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false

  const error = value as Record<string, unknown>
  return typeof error.code === "string" && typeof error.message === "string"
}

function requireId(value: string | null, label: string): string {
  if (!value) {
    throw new Error(`${label} is required`)
  }

  return value
}

function buildWorkspacePath(
  workspaceId: string | null,
  suffix: string,
): string {
  return `/api/workspaces/${requireId(workspaceId, "workspaceId")}${suffix}`
}

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers)

    if (options?.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers,
    })

    const data: unknown = await res.json()

    if (!res.ok) {
      if (isApiError(data)) {
        throw new ApiRequestError(data.code, data.message, res.status)
      }

      throw new ApiRequestError("UNKNOWN", "Request failed", res.status)
    }

    return data as T
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url)
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  async patch<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
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

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ListFilesResponse {
  data: FileObject[]
  meta: PaginationMeta
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
  meta: PaginationMeta
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
): UseQueryResult<ListFilesResponse, ApiRequestError> {
  return useQuery<ListFilesResponse, ApiRequestError>({
    queryKey: ["files", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()

      if (options?.folderId) params.set("folderId", options.folderId)
      if (options?.sort) params.set("sort", options.sort)
      if (options?.order) params.set("order", options.order)
      if (options?.page !== undefined) params.set("page", String(options.page))
      if (options?.limit !== undefined) params.set("limit", String(options.limit))

      const qs = params.toString()
      return api.get<ListFilesResponse>(
        `${buildWorkspacePath(workspaceId, "/files")}${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: workspaceId !== null,
  })
}

export function useFolders(
  workspaceId: string | null,
  parentFolderId?: string | null,
): UseQueryResult<ListFoldersResponse, ApiRequestError> {
  return useQuery<ListFoldersResponse, ApiRequestError>({
    queryKey: ["folders", workspaceId, parentFolderId],
    queryFn: () => {
      const params = new URLSearchParams()

      if (parentFolderId) params.set("parentFolderId", parentFolderId)

      const qs = params.toString()
      return api.get<ListFoldersResponse>(
        `${buildWorkspacePath(workspaceId, "/folders")}${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: workspaceId !== null,
  })
}

export function useBreadcrumbs(
  workspaceId: string | null,
  folderId: string | null,
): UseQueryResult<BreadcrumbItem[], ApiRequestError> {
  return useQuery<BreadcrumbItem[], ApiRequestError>({
    queryKey: ["breadcrumbs", workspaceId, folderId],
    queryFn: () =>
      api.get<BreadcrumbItem[]>(
        buildWorkspacePath(
          workspaceId,
          `/folders/${requireId(folderId, "folderId")}/breadcrumbs`,
        ),
      ),
    enabled: workspaceId !== null && folderId !== null,
  })
}

export function useInitiateUpload(): UseMutationResult<
  InitiateUploadResponse,
  ApiRequestError,
  InitiateUploadRequest & { workspaceId: string }
> {
  const queryClient = useQueryClient()

  return useMutation<
    InitiateUploadResponse,
    ApiRequestError,
    InitiateUploadRequest & { workspaceId: string }
  >({
    mutationFn: ({ workspaceId, ...body }) =>
      api.post<InitiateUploadResponse>(
        buildWorkspacePath(workspaceId, "/files/upload"),
        body,
      ),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["files", variables.workspaceId] })
    },
  })
}

export function useCompleteUpload(): UseMutationResult<
  FileObject,
  ApiRequestError,
  CompleteUploadRequest & { workspaceId: string }
> {
  const queryClient = useQueryClient()

  return useMutation<FileObject, ApiRequestError, CompleteUploadRequest & { workspaceId: string }>({
    mutationFn: ({ workspaceId, ...body }) =>
      api.post<FileObject>(
        buildWorkspacePath(workspaceId, "/files/upload/complete"),
        body,
      ),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["files", data.workspaceId] })
    },
  })
}

export function useDownloadUrl(
  workspaceId: string | null,
  fileId: string | null,
): UseQueryResult<DownloadUrlResponse, ApiRequestError> {
  return useQuery<DownloadUrlResponse, ApiRequestError>({
    queryKey: ["download", workspaceId, fileId],
    queryFn: () =>
      api.get<DownloadUrlResponse>(
        buildWorkspacePath(workspaceId, `/files/${requireId(fileId, "fileId")}/download`),
      ),
    enabled: workspaceId !== null && fileId !== null,
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

interface WorkspacesResponse {
  data: WorkspaceData[]
}

export function useWorkspaces(): UseQueryResult<WorkspacesResponse, ApiRequestError> {
  return useQuery<WorkspacesResponse, ApiRequestError>({
    queryKey: ["workspaces"],
    queryFn: () => api.get<WorkspacesResponse>("/api/workspaces"),
  })
}

interface RenameFileResponse {
  id: string
  originalName: string
  extension: string | null
  updatedAt: string
}

export function useRenameFile(
  workspaceId: string | null,
): UseMutationResult<RenameFileResponse, ApiRequestError, { fileId: string; name: string }> {
  const queryClient = useQueryClient()

  return useMutation<RenameFileResponse, ApiRequestError, { fileId: string; name: string }>({
    mutationFn: ({ fileId, name }) =>
      api.patch<RenameFileResponse>(
        buildWorkspacePath(workspaceId, `/files/${fileId}`),
        { name },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
    },
  })
}

interface DeleteFileResponse {
  success: true
  fileId: string
}

export function useDeleteFile(
  workspaceId: string | null,
): UseMutationResult<DeleteFileResponse, ApiRequestError, { fileId: string }> {
  const queryClient = useQueryClient()

  return useMutation<DeleteFileResponse, ApiRequestError, { fileId: string }>({
    mutationFn: ({ fileId }) =>
      api.delete<DeleteFileResponse>(buildWorkspacePath(workspaceId, `/files/${fileId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
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

export function useCreateFolder(
  workspaceId: string | null,
): UseMutationResult<
  FolderResponse,
  ApiRequestError,
  { name: string; parentFolderId?: string | null }
> {
  const queryClient = useQueryClient()

  return useMutation<
    FolderResponse,
    ApiRequestError,
    { name: string; parentFolderId?: string | null }
  >({
    mutationFn: ({ name, parentFolderId }) =>
      api.post<FolderResponse>(buildWorkspacePath(workspaceId, "/folders"), {
        name,
        parentFolderId: parentFolderId ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
    },
  })
}

export function useUpdateFolder(
  workspaceId: string | null,
): UseMutationResult<
  FolderResponse,
  ApiRequestError,
  { folderId: string; name?: string; parentFolderId?: string | null }
> {
  const queryClient = useQueryClient()

  return useMutation<
    FolderResponse,
    ApiRequestError,
    { folderId: string; name?: string; parentFolderId?: string | null }
  >({
    mutationFn: ({ folderId, name, parentFolderId }) =>
      api.patch<FolderResponse>(
        buildWorkspacePath(workspaceId, `/folders/${folderId}`),
        { name, parentFolderId },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
    },
  })
}

export function useDeleteFolder(
  workspaceId: string | null,
): UseMutationResult<DeleteFolderResponse, ApiRequestError, { folderId: string }> {
  const queryClient = useQueryClient()

  return useMutation<DeleteFolderResponse, ApiRequestError, { folderId: string }>({
    mutationFn: ({ folderId }) =>
      api.delete<DeleteFolderResponse>(buildWorkspacePath(workspaceId, `/folders/${folderId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
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

export function useMoveFile(
  workspaceId: string | null,
): UseMutationResult<
  UpdateFileResponse,
  ApiRequestError,
  { fileId: string; folderId: string | null }
> {
  const queryClient = useQueryClient()

  return useMutation<
    UpdateFileResponse,
    ApiRequestError,
    { fileId: string; folderId: string | null }
  >({
    mutationFn: ({ fileId, folderId }) =>
      api.patch<UpdateFileResponse>(
        buildWorkspacePath(workspaceId, `/files/${fileId}`),
        { folderId },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
    },
  })
}

interface ListSharesResponse {
  data: ShareDashboardItem[]
  meta: PaginationMeta & {
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
): UseQueryResult<ListSharesResponse, ApiRequestError> {
  return useQuery<ListSharesResponse, ApiRequestError>({
    queryKey: ["shares", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()

      if (options?.scope) params.set("scope", options.scope)
      if (options?.page !== undefined) params.set("page", String(options.page))
      if (options?.limit !== undefined) params.set("limit", String(options.limit))

      const qs = params.toString()
      return api.get<ListSharesResponse>(
        `${buildWorkspacePath(workspaceId, "/shares")}${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: workspaceId !== null && options?.enabled !== false,
  })
}

export function useCreateShare(
  workspaceId: string | null,
): UseMutationResult<ShareLink, ApiRequestError, CreateShareRequest> {
  const queryClient = useQueryClient()

  return useMutation<ShareLink, ApiRequestError, CreateShareRequest>({
    mutationFn: (body) =>
      api.post<ShareLink>(buildWorkspacePath(workspaceId, "/shares"), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

export function useUpdateShare(
  workspaceId: string | null,
): UseMutationResult<ShareLink, ApiRequestError, UpdateShareRequest & { shareId: string }> {
  const queryClient = useQueryClient()

  return useMutation<ShareLink, ApiRequestError, UpdateShareRequest & { shareId: string }>({
    mutationFn: ({ shareId, ...body }) =>
      api.patch<ShareLink>(buildWorkspacePath(workspaceId, `/shares/${shareId}`), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

export function useDeleteShare(
  workspaceId: string | null,
): UseMutationResult<{ success: boolean; shareId: string }, ApiRequestError, { shareId: string }> {
  const queryClient = useQueryClient()

  return useMutation<
    { success: boolean; shareId: string },
    ApiRequestError,
    { shareId: string }
  >({
    mutationFn: ({ shareId }) =>
      api.delete<{ success: boolean; shareId: string }>(
        buildWorkspacePath(workspaceId, `/shares/${shareId}`),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
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
  breadcrumbs: Array<{ id: string | null; name: string }>
  files: Array<{ id: string; name: string; mimeType: string; sizeBytes: number }>
  folders: Array<{ id: string; name: string }>
}

export function useShareInfo(
  shareId: string | null,
): UseQueryResult<ShareInfoData, ApiRequestError> {
  return useQuery<ShareInfoData, ApiRequestError>({
    queryKey: ["shareInfo", shareId],
    queryFn: () => api.get<ShareInfoData>(`/api/shares/${requireId(shareId, "shareId")}`),
    enabled: shareId !== null,
    retry: (failureCount, error) => {
      if (error.status === 404 || error.status === 410 || error.status === 423) {
        return false
      }

      return failureCount < 3
    },
  })
}

export function useAccessShare(
  shareId: string | null,
): UseMutationResult<ShareAccessResult, ApiRequestError, { password?: string }> {
  const queryClient = useQueryClient()

  return useMutation<ShareAccessResult, ApiRequestError, { password?: string }>({
    mutationFn: (body) =>
      api.post<ShareAccessResult>(`/api/shares/${requireId(shareId, "shareId")}/access`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shareInfo", shareId] })
    },
  })
}

export function useBrowseShare(
  shareId: string | null,
): UseMutationResult<ShareBrowseResult, ApiRequestError, { folderId?: string; password: string }> {
  const queryClient = useQueryClient()

  return useMutation<ShareBrowseResult, ApiRequestError, { folderId?: string; password: string }>({
    mutationFn: ({ folderId, password }) => {
      const params = new URLSearchParams({
        password,
      })

      if (folderId) {
        params.set("folderId", folderId)
      }

      return api.get<ShareBrowseResult>(
        `/api/shares/${requireId(shareId, "shareId")}/browse?${params.toString()}`,
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shareBrowse", shareId] })
    },
  })
}

export type {
  FileObject,
  Folder,
  BreadcrumbItem,
  CompleteUploadRequest as CompleteUploadPayload,
  CreateShareRequest,
  DownloadUrlResponse,
  InitiateUploadRequest,
  InitiateUploadResponse,
  ListFilesResponse,
  ListFoldersResponse,
  ListSharesResponse,
  ShareAccessResult,
  ShareBrowseResult,
  ShareInfoData,
  ShareLink,
  WorkspaceData,
}
