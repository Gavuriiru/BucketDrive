import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query"
import type {
  DashboardAuditItem,
  DashboardOverview,
  FileObject,
  Folder,
  ShareDashboardItem,
  ShareLink,
  SharesListScope,
  Tag,
  TrashItem,
  WorkspaceSettings,
  WorkspaceMemberListItem,
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

interface ListTrashResponse {
  data: TrashItem[]
  meta: PaginationMeta
}

interface ListTagsResponse {
  data: Tag[]
}

interface SearchFilesResponse {
  data: FileObject[]
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
  enabled?: boolean
}

export interface UseSearchOptions {
  q?: string
  type?: "all" | "documents" | "images" | "videos" | "audio" | "archives"
  tags?: string[]
  favorite?: boolean
  sort?: "relevance" | "name" | "created_at" | "size" | "type"
  order?: "asc" | "desc"
  page?: number
  limit?: number
  enabled?: boolean
}

export interface UseTrashOptions {
  q?: string
  sort?: "deleted_at" | "name" | "location" | "size"
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
    enabled: workspaceId !== null && options?.enabled !== false,
  })
}

export function useSearchFiles(
  workspaceId: string | null,
  options?: UseSearchOptions,
): UseQueryResult<SearchFilesResponse, ApiRequestError> {
  return useQuery<SearchFilesResponse, ApiRequestError>({
    queryKey: ["search", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()

      if (options?.q) params.set("q", options.q)
      if (options?.type) params.set("type", options.type)
      if (options?.tags) {
        for (const tagId of options.tags) {
          params.append("tags", tagId)
        }
      }
      if (options?.favorite !== undefined) params.set("favorite", String(options.favorite))
      if (options?.sort) params.set("sort", options.sort)
      if (options?.order) params.set("order", options.order)
      if (options?.page !== undefined) params.set("page", String(options.page))
      if (options?.limit !== undefined) params.set("limit", String(options.limit))

      const qs = params.toString()
      return api.get<SearchFilesResponse>(
        `${buildWorkspacePath(workspaceId, "/search")}${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: workspaceId !== null && options?.enabled !== false,
    staleTime: 30_000,
  })
}

export function useFolders(
  workspaceId: string | null,
  parentFolderId?: string | null,
  enabled = true,
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
    enabled: workspaceId !== null && enabled,
  })
}

export function useTrash(
  workspaceId: string | null,
  options?: UseTrashOptions,
): UseQueryResult<ListTrashResponse, ApiRequestError> {
  return useQuery<ListTrashResponse, ApiRequestError>({
    queryKey: ["trash", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()

      if (options?.q) params.set("q", options.q)
      if (options?.sort) params.set("sort", options.sort)
      if (options?.order) params.set("order", options.order)
      if (options?.page !== undefined) params.set("page", String(options.page))
      if (options?.limit !== undefined) params.set("limit", String(options.limit))

      const qs = params.toString()
      return api.get<ListTrashResponse>(
        `${buildWorkspacePath(workspaceId, "/trash")}${qs ? `?${qs}` : ""}`,
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
      void queryClient.invalidateQueries({ queryKey: ["search", variables.workspaceId] })
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
      void queryClient.invalidateQueries({ queryKey: ["search", data.workspaceId] })
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

interface DashboardAuditResponse {
  data: DashboardAuditItem[]
  meta: PaginationMeta
}

interface MembersResponse {
  data: WorkspaceMemberListItem[]
  meta: PaginationMeta
}

export function useWorkspaces(): UseQueryResult<WorkspacesResponse, ApiRequestError> {
  return useQuery<WorkspacesResponse, ApiRequestError>({
    queryKey: ["workspaces"],
    queryFn: () => api.get<WorkspacesResponse>("/api/workspaces"),
  })
}

export function useDashboardOverview(
  workspaceId: string | null,
): UseQueryResult<DashboardOverview, ApiRequestError> {
  return useQuery<DashboardOverview, ApiRequestError>({
    queryKey: ["dashboard-overview", workspaceId],
    queryFn: () => api.get<DashboardOverview>(buildWorkspacePath(workspaceId, "/dashboard/overview")),
    enabled: workspaceId !== null,
  })
}

export interface UseDashboardAuditOptions {
  actorId?: string
  action?: string
  resourceType?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export function useDashboardAudit(
  workspaceId: string | null,
  options?: UseDashboardAuditOptions,
): UseQueryResult<DashboardAuditResponse, ApiRequestError> {
  return useQuery<DashboardAuditResponse, ApiRequestError>({
    queryKey: ["dashboard-audit", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()
      if (options?.actorId) params.set("actorId", options.actorId)
      if (options?.action) params.set("action", options.action)
      if (options?.resourceType) params.set("resourceType", options.resourceType)
      if (options?.from) params.set("from", options.from)
      if (options?.to) params.set("to", options.to)
      if (options?.page !== undefined) params.set("page", String(options.page))
      if (options?.limit !== undefined) params.set("limit", String(options.limit))
      const qs = params.toString()
      return api.get<DashboardAuditResponse>(
        `${buildWorkspacePath(workspaceId, "/dashboard/audit")}${qs ? `?${qs}` : ""}`,
      )
    },
    enabled: workspaceId !== null,
  })
}

export function useDashboardSettings(
  workspaceId: string | null,
): UseQueryResult<WorkspaceSettings, ApiRequestError> {
  return useQuery<WorkspaceSettings, ApiRequestError>({
    queryKey: ["dashboard-settings", workspaceId],
    queryFn: () => api.get<WorkspaceSettings>(buildWorkspacePath(workspaceId, "/dashboard/settings")),
    enabled: workspaceId !== null,
  })
}

export function useUpdateDashboardSettings(
  workspaceId: string | null,
): UseMutationResult<WorkspaceSettings, ApiRequestError, WorkspaceSettings> {
  const queryClient = useQueryClient()

  return useMutation<WorkspaceSettings, ApiRequestError, WorkspaceSettings>({
    mutationFn: (body) => api.patch<WorkspaceSettings>(buildWorkspacePath(workspaceId, "/dashboard/settings"), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-settings", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["dashboard-overview", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

export function useMembers(
  workspaceId: string | null,
): UseQueryResult<MembersResponse, ApiRequestError> {
  return useQuery<MembersResponse, ApiRequestError>({
    queryKey: ["members", workspaceId],
    queryFn: () => api.get<MembersResponse>(buildWorkspacePath(workspaceId, "/members")),
    enabled: workspaceId !== null,
  })
}

export function useAddMember(
  workspaceId: string | null,
): UseMutationResult<
  WorkspaceMemberListItem,
  ApiRequestError,
  { email: string; role: Exclude<WorkspaceRole, "owner"> }
> {
  const queryClient = useQueryClient()

  return useMutation<
    WorkspaceMemberListItem,
    ApiRequestError,
    { email: string; role: Exclude<WorkspaceRole, "owner"> }
  >({
    mutationFn: (body) => api.post<WorkspaceMemberListItem>(buildWorkspacePath(workspaceId, "/members"), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["dashboard-overview", workspaceId] })
    },
  })
}

export function useUpdateMemberRole(
  workspaceId: string | null,
): UseMutationResult<
  WorkspaceMemberListItem,
  ApiRequestError,
  { memberId: string; role: WorkspaceRole }
> {
  const queryClient = useQueryClient()

  return useMutation<WorkspaceMemberListItem, ApiRequestError, { memberId: string; role: WorkspaceRole }>({
    mutationFn: ({ memberId, role }) =>
      api.patch<WorkspaceMemberListItem>(buildWorkspacePath(workspaceId, `/members/${memberId}`), { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", workspaceId] })
    },
  })
}

export function useRemoveMember(
  workspaceId: string | null,
): UseMutationResult<{ success: true; memberId: string }, ApiRequestError, { memberId: string }> {
  const queryClient = useQueryClient()

  return useMutation<{ success: true; memberId: string }, ApiRequestError, { memberId: string }>({
    mutationFn: ({ memberId }) =>
      api.delete<{ success: true; memberId: string }>(buildWorkspacePath(workspaceId, `/members/${memberId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["dashboard-overview", workspaceId] })
    },
  })
}

export function useTags(
  workspaceId: string | null,
): UseQueryResult<ListTagsResponse, ApiRequestError> {
  return useQuery<ListTagsResponse, ApiRequestError>({
    queryKey: ["tags", workspaceId],
    queryFn: () => api.get<ListTagsResponse>(buildWorkspacePath(workspaceId, "/tags")),
    enabled: workspaceId !== null,
  })
}

export function useCreateTag(
  workspaceId: string | null,
): UseMutationResult<Tag, ApiRequestError, { name: string; color: string }> {
  const queryClient = useQueryClient()

  return useMutation<Tag, ApiRequestError, { name: string; color: string }>({
    mutationFn: (body) => api.post<Tag>(buildWorkspacePath(workspaceId, "/tags"), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
    },
  })
}

export function useUpdateTag(
  workspaceId: string | null,
): UseMutationResult<Tag, ApiRequestError, { tagId: string; name?: string; color?: string }> {
  const queryClient = useQueryClient()

  return useMutation<Tag, ApiRequestError, { tagId: string; name?: string; color?: string }>({
    mutationFn: ({ tagId, ...body }) =>
      api.patch<Tag>(buildWorkspacePath(workspaceId, `/tags/${tagId}`), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
    },
  })
}

export function useDeleteTag(
  workspaceId: string | null,
): UseMutationResult<{ success: true; tagId: string }, ApiRequestError, { tagId: string }> {
  const queryClient = useQueryClient()

  return useMutation<{ success: true; tagId: string }, ApiRequestError, { tagId: string }>({
    mutationFn: ({ tagId }) =>
      api.delete<{ success: true; tagId: string }>(buildWorkspacePath(workspaceId, `/tags/${tagId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
    },
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
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
    },
  })
}

interface DeleteFileResponse {
  success: true
  fileId: string
}

interface RestoreFileResponse {
  success: true
  fileId: string
  restoredToFolderId: string | null
  restoredName: string
  restoredToRoot: boolean
}

interface RestoreFolderResponse {
  success: true
  folderId: string
  restoredToFolderId: string | null
  restoredName: string
  restoredToRoot: boolean
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
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
    },
  })
}

export function useRestoreFile(
  workspaceId: string | null,
): UseMutationResult<RestoreFileResponse, ApiRequestError, { fileId: string }> {
  const queryClient = useQueryClient()

  return useMutation<RestoreFileResponse, ApiRequestError, { fileId: string }>({
    mutationFn: ({ fileId }) =>
      api.post<RestoreFileResponse>(buildWorkspacePath(workspaceId, `/files/${fileId}/restore`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

export function usePermanentlyDeleteFile(
  workspaceId: string | null,
): UseMutationResult<DeleteFileResponse, ApiRequestError, { fileId: string }> {
  const queryClient = useQueryClient()

  return useMutation<DeleteFileResponse, ApiRequestError, { fileId: string }>({
    mutationFn: ({ fileId }) =>
      api.delete<DeleteFileResponse>(buildWorkspacePath(workspaceId, `/files/${fileId}/permanent`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

export function useToggleFavorite(
  workspaceId: string | null,
): UseMutationResult<{ fileId: string; isFavorited: boolean }, ApiRequestError, { fileId: string }> {
  const queryClient = useQueryClient()

  return useMutation<{ fileId: string; isFavorited: boolean }, ApiRequestError, { fileId: string }>({
    mutationFn: ({ fileId }) =>
      api.post<{ fileId: string; isFavorited: boolean }>(
        buildWorkspacePath(workspaceId, `/files/${fileId}/favorite`),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] })
    },
  })
}

export function useUpdateFileTags(
  workspaceId: string | null,
): UseMutationResult<FileObject, ApiRequestError, { fileId: string; tagIds: string[] }> {
  const queryClient = useQueryClient()

  return useMutation<FileObject, ApiRequestError, { fileId: string; tagIds: string[] }>({
    mutationFn: ({ fileId, tagIds }) =>
      api.post<FileObject>(buildWorkspacePath(workspaceId, `/files/${fileId}/tags`), { tagIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] })
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
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
    },
  })
}

export function useRestoreFolder(
  workspaceId: string | null,
): UseMutationResult<RestoreFolderResponse, ApiRequestError, { folderId: string }> {
  const queryClient = useQueryClient()

  return useMutation<RestoreFolderResponse, ApiRequestError, { folderId: string }>({
    mutationFn: ({ folderId }) =>
      api.post<RestoreFolderResponse>(
        buildWorkspacePath(workspaceId, `/folders/${folderId}/restore`),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
    },
  })
}

export function usePermanentlyDeleteFolder(
  workspaceId: string | null,
): UseMutationResult<DeleteFolderResponse, ApiRequestError, { folderId: string }> {
  const queryClient = useQueryClient()

  return useMutation<DeleteFolderResponse, ApiRequestError, { folderId: string }>({
    mutationFn: ({ folderId }) =>
      api.delete<DeleteFolderResponse>(
        buildWorkspacePath(workspaceId, `/folders/${folderId}/permanent`),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["files", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ["shares", workspaceId] })
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
      void queryClient.invalidateQueries({ queryKey: ["search", workspaceId] })
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
  options?: { scope?: SharesListScope; q?: string; page?: number; limit?: number; enabled?: boolean },
): UseQueryResult<ListSharesResponse, ApiRequestError> {
  return useQuery<ListSharesResponse, ApiRequestError>({
    queryKey: ["shares", workspaceId, options],
    queryFn: () => {
      const params = new URLSearchParams()

      if (options?.scope) params.set("scope", options.scope)
      if (options?.q) params.set("q", options.q)
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
  ListTrashResponse,
  ListSharesResponse,
  ShareAccessResult,
  ShareBrowseResult,
  ShareInfoData,
  ShareLink,
  TrashItem,
  WorkspaceData,
}
