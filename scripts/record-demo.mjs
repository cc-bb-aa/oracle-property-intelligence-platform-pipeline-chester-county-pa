import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8080";
await mkdir("demo/out", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: "demo/out", size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#run", { timeout: 30000 });
await page.waitForTimeout(1500);
await page.click("#query");
await page.waitForTimeout(2000);
await page.check("#open");
await page.click("#query");
await page.waitForTimeout(2000);
await page.click("#ask");
await page.waitForTimeout(2500);
await context.close();
await browser.close();
console.log("wrote demo/out/*.webm");
