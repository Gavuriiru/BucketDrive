import { expect, test } from "@playwright/test"
import { createFileFixturesBulk, getWorkspace, loginAs, users } from "./helpers"

test("explorer opens quickly with a 10000-file workspace", async ({ page }) => {
  await loginAs(page, users.owner)
  const workspace = await getWorkspace(page.request)
  const prefix = `000-benchmark-${String(Date.now())}`

  const created = await createFileFixturesBulk(page.request, workspace.id, 10_000, prefix)
  expect(created.inserted).toBe(10_000)

  const apiStarted = performance.now()
  const filesResponse = await page.request.get(`/api/workspaces/${workspace.id}/files?limit=100`)
  const apiMs = performance.now() - apiStarted
  expect(filesResponse.ok()).toBeTruthy()
  expect(apiMs).toBeLessThan(500)

  await page.goto("/dashboard/files")
  await expect(page.getByTestId("file-card").first()).toBeVisible()

  const cards = page.getByTestId("file-card")
  await expect(cards).toHaveCount(100)
  await cards.last().scrollIntoViewIfNeeded()
  await expect(cards.last()).toBeVisible()
})
