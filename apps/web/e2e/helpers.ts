import { expect, type APIRequestContext, type Page } from "@playwright/test"

export const users = {
  owner: "owner@bucketdrive.dev",
  viewer: "viewer@bucketdrive.dev",
} as const

interface Workspace {
  id: string
  name: string
  role: string
}

interface FileFixture {
  id: string
  originalName: string
}

export async function loginAs(page: Page, email: string): Promise<void> {
  const response = await page.request.post("/api/e2e/login", {
    data: { email },
  })
  expect(response.ok()).toBeTruthy()
}

export async function getWorkspace(request: APIRequestContext): Promise<Workspace> {
  const response = await request.get("/api/workspaces")
  expect(response.ok()).toBeTruthy()

  const body = (await response.json()) as { data: Workspace[] }
  expect(body.data.length).toBeGreaterThan(0)
  const workspace = body.data[0]
  expect(workspace).toBeDefined()
  return workspace as Workspace
}

export async function createFileFixture(
  request: APIRequestContext,
  workspaceId: string,
  name: string,
  options: { deleted?: boolean; mimeType?: string; sizeBytes?: number } = {},
): Promise<FileFixture> {
  const response = await request.post("/api/e2e/files", {
    data: {
      workspaceId,
      name,
      mimeType: options.mimeType ?? "text/plain",
      sizeBytes: options.sizeBytes ?? 1024,
      deleted: options.deleted ?? false,
    },
  })
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as FileFixture
}

export async function createFileFixturesBulk(
  request: APIRequestContext,
  workspaceId: string,
  count: number,
  prefix: string,
): Promise<{ inserted: number }> {
  const response = await request.post("/api/e2e/files/bulk", {
    data: {
      workspaceId,
      count,
      prefix,
    },
  })
  const body = await response.text()
  expect(response.ok(), body.slice(0, 1_000)).toBeTruthy()
  return JSON.parse(body) as { inserted: number }
}

export async function createExternalShare(
  request: APIRequestContext,
  workspaceId: string,
  fileId: string,
  password: string,
): Promise<{ id: string }> {
  const response = await request.post(`/api/workspaces/${workspaceId}/shares`, {
    data: {
      resourceId: fileId,
      resourceType: "file",
      shareType: "external_direct",
      password,
    },
  })
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as { id: string }
}

export function uniqueName(prefix: string, extension = "txt"): string {
  return `${prefix}-${String(Date.now())}-${Math.random().toString(16).slice(2)}.${extension}`
}
