import { test, expect } from "@playwright/test";

test("demo transcript surfaces exist", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Oracle pipeline/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Pipeline run summary/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Agent query/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /MCP-ready/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /DuckDB-backed query layer/ })).toBeVisible();
  await expect(page.locator("#run")).not.toHaveText("loading…", { timeout: 30_000 });
  await expect(page.locator("#coverage")).toContainText("Chester");
});

test("radius query returns aged roofs", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#run")).not.toHaveText("loading…", { timeout: 30_000 });
  await page.locator("#aged").check();
  await page.getByRole("button", { name: "Query" }).click();
  await expect(page.locator("#table")).toContainText("matches", { timeout: 30_000 });
  await expect(page.locator("#table")).not.toHaveText(/^0 matches/);
  await expect(page.locator("#table")).toContainText(/land-dev|roof/i);
});

test("agent question returns evidence", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#run")).not.toHaveText("loading…", { timeout: 30_000 });
  await page.getByRole("button", { name: "Ask agent" }).click();
  await expect(page.locator("#agent")).toContainText("matching properties", { timeout: 30_000 });
  await expect(page.locator("#agent")).not.toHaveText(/0 matching properties/);
});

test("open-roofing agent returns county permits and a UCC caveat", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#run")).not.toHaveText("loading…", { timeout: 30_000 });
  await page.locator("#q").fill(
    "Which properties near that area have open roofing permits that have been open for many years, and who is the listed contractor?",
  );
  await page.getByRole("button", { name: "Ask agent" }).click();
  await expect(page.locator("#agent")).toContainText("matching properties", { timeout: 30_000 });
  await expect(page.locator("#agent")).not.toHaveText(/0 matching properties/);
  await expect(page.locator("#agent")).toContainText("not in the public harvest");
});
