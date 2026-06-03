import { expect, test } from "@playwright/test"
import {
  createExternalShare,
  createFileFixture,
  getWorkspace,
  loginAs,
  uniqueName,
  users,
} from "./helpers"

test("created upload fixture appears in the explorer", async ({ page }) => {
  await loginAs(page, users.owner)
  const workspace = await getWorkspace(page.request)
  const fileName = uniqueName("e2e-upload")

  await createFileFixture(page.request, workspace.id, fileName)
  await page.goto("/dashboard/files")

  await expect(page.getByText(fileName)).toBeVisible()
})

test("password protected public share can be opened and exposes download action", async ({
  page,
  browser,
}) => {
  await loginAs(page, users.owner)
  const workspace = await getWorkspace(page.request)
  const file = await createFileFixture(page.request, workspace.id, uniqueName("e2e-share"))
  const share = await createExternalShare(page.request, workspace.id, file.id, "test1234")

  const externalContext = await browser.newContext()
  const external = await externalContext.newPage()
  await external.goto(`/share/${share.id}`)
  await external.getByTestId("share-password").fill("test1234")
  await external.getByTestId("share-access").click()

  await expect(external.getByTestId("download-file")).toBeVisible()
  await externalContext.close()
})

test("viewer can browse files but cannot access delete actions", async ({ page }) => {
  await loginAs(page, users.viewer)
  const workspace = await getWorkspace(page.request)
  expect(workspace.role).toBe("viewer")
  const fileName = uniqueName("e2e-viewer")
  await createFileFixture(page.request, workspace.id, fileName)

  await page.goto("/dashboard/files")
  await expect(page.getByTestId("files-page")).toHaveAttribute("data-workspace-role", "viewer")
  const card = page.getByText(fileName).locator("xpath=ancestor::*[@data-testid='file-card']")
  await expect(card).toBeVisible()
  await expect(page.getByText("Delete selected")).toHaveCount(0)

  await card.click({ button: "right" })
  const visibleMenu = page.locator('[role="menu"]:visible')
  await expect(visibleMenu).toBeVisible()
  await expect(visibleMenu.getByRole("menuitem", { name: /Delete/ })).toHaveCount(0)
})

test("search filters files and clear returns to browse results", async ({ page }) => {
  await loginAs(page, users.owner)
  const workspace = await getWorkspace(page.request)
  const fileName = uniqueName("e2e-search")
  await createFileFixture(page.request, workspace.id, fileName)

  await page.goto("/dashboard/files")
  await page.getByPlaceholder("Search files, tags, and favorites").fill(fileName)
  await expect(page.getByTestId("file-card").getByText(fileName)).toBeVisible()

  await page.getByRole("button", { name: "Clear search" }).click()
  await expect(page.getByTestId("file-card").getByText(fileName)).toBeVisible()
})

test("deleted file appears in trash and can be restored", async ({ page }) => {
  await loginAs(page, users.owner)
  const workspace = await getWorkspace(page.request)
  const fileName = uniqueName("e2e-trash")
  const file = await createFileFixture(page.request, workspace.id, fileName)

  const deleted = await page.request.delete(`/api/workspaces/${workspace.id}/files/${file.id}`)
  expect(deleted.ok()).toBeTruthy()

  await page.goto("/dashboard/trash")
  const row = page.getByRole("row", { name: new RegExp(fileName) })
  await expect(row).toBeVisible()
  await row.getByRole("button", { name: "Restore" }).click()

  await page.goto("/dashboard/files")
  await expect(page.getByText(fileName)).toBeVisible()
})
