import { test, expect } from "@playwright/test";

test("demo transcript surfaces exist", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Oracle pipeline/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Pipeline run summary/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Agent query/ })).toBeVisible();
  await expect(page.locator("#run")).not.toHaveText("loading…", { timeout: 30_000 });
});

test("radius query returns aged roofs", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#run")).not.toHaveText("loading…", { timeout: 30_000 });
  await page.getByRole("button", { name: "Query" }).click();
  await expect(page.locator("#table")).toContainText("matches", { timeout: 30_000 });
});

test("agent question returns evidence", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#run")).not.toHaveText("loading…", { timeout: 30_000 });
  await page.getByRole("button", { name: "Ask agent" }).click();
  await expect(page.locator("#agent")).toContainText("matching properties", { timeout: 30_000 });
});
