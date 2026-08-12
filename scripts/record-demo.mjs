import { chromium } from "@playwright/test";
import { mkdir, rename, readdir } from "node:fs/promises";
import { join } from "node:path";

const base =
  process.env.E2E_BASE_URL ??
  "https://cc-bb-aa.github.io/oracle-property-intelligence-platform-pipeline-chester-county-pa/";
await mkdir("demo/out", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: "demo/out", size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForFunction(
  () => {
    const t = document.getElementById("run")?.textContent ?? "";
    return t.includes("permits") && !t.includes("loading");
  },
  null,
  { timeout: 30000 },
);
await page.waitForTimeout(1200);
await page.click("#query");
await page.waitForTimeout(1800);
await page.check("#open");
await page.click("#query");
await page.waitForTimeout(1800);
await page.locator("#q").fill(
  "Which properties near that area have open roofing permits that have been open for many years, and who is the listed contractor?",
);
await page.click("#ask");
await page.waitForTimeout(2500);
await context.close();
await browser.close();

const files = (await readdir("demo/out")).filter((f) => f.endsWith(".webm") && !f.includes("transcript"));
if (files[0]) {
  await rename(join("demo/out", files[0]), join("demo/out", "oracle-demo-transcript.webm"));
}
console.log("wrote demo/out/oracle-demo-transcript.webm from", base);
