import { expect, test } from "@playwright/test"
import { loginAs, users } from "./helpers"

test("test auth creates a browser session, persists it, and signs out", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "BucketDrive" })).toBeVisible()

  await loginAs(page, users.owner)
  await page.goto("/dashboard/files")
  await expect(page.getByText("Owner User")).toBeVisible()

  await page.reload()
  await expect(page.getByText("Owner User")).toBeVisible()

  await page.getByTestId("sign-out").click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId("github-login")).toBeVisible()
})
