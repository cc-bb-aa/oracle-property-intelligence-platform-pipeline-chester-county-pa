import { test, expect } from "@playwright/test";

test("health and UI surfaces exist", async ({ request, page }) => {
  const health = await request.get("/health");
  expect(health.ok()).toBeTruthy();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Oracle pipeline/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Pipeline run summary/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Agent query/ })).toBeVisible();
});

test("run summary API shape", async ({ request }) => {
  const res = await request.get("/api/run");
  expect(res.ok()).toBeTruthy();
});
