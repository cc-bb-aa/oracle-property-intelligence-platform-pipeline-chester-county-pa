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

async function say(text, ms = 2800) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;background:#1c2b24;color:#f4f1ea;padding:12px 16px;border-radius:8px;font:15px/1.4 ui-sans-serif,system-ui;box-shadow:0 8px 24px #0008";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
  await page.waitForTimeout(ms);
}

async function show(sel) {
  await page.locator(sel).scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
}

await page.goto(base, { waitUntil: "load", timeout: 45000 });
await page.locator("#run").waitFor({ timeout: 30000 });
await page.waitForFunction(
  () => (document.getElementById("run")?.textContent || "").length > 80,
  null,
  { timeout: 30000 },
);

await say(
  "I will demonstrate that the Oracle pipeline has loaded the available Chester County, PA dataset, that it is queryable through DuckDB, that artifacts have content IDs, and that the UI and agent answer roofing-lead questions.",
  4000,
);
await show("#sec-run");
await say("First, I am opening the pipeline run summary. Primary county is Chester. Montgomery, Delaware, and Bucks were documented and unused.");
await show("#sec-counts");
await say("Show the total uploaded records by source: properties, permits, ownership, contractors (BBB where available), businesses, and coordinates.");
await show("#sec-duckdb");
await say("Now I am opening the DuckDB-backed query layer. Same schema as the DuckDB file; hosted Pages queries the published JSON without an Oracle warehouse.");
await show("#sec-ipfs");
await say("Show the IPFS artifacts created for the uploaded datasets. These are CIDv0 content identifiers (ipfs-only-hash).");
await show("#sec-query");
await say("Using the UI, show properties within five miles of West Chester that have roofs older than 15 years.");
await page.check("#aged");
await page.uncheck("#open").catch(() => {});
await page.click("#query");
await page.waitForTimeout(1500);
await show("#table");
await say("Matching properties include roof-age basis, coordinates, and source provenance.");
await say("Show properties in that area with open roofing permits that have remained open for many years, including contractor and BBB where available.");
await page.uncheck("#aged").catch(() => {});
await page.check("#open");
await page.click("#query");
await page.waitForTimeout(1500);
await show("#table");
await show("#sec-agent");
await say("Now I am asking the same type of questions through the agent.");
await page.locator("#q").fill(
  "Which properties in Chester County within five miles of West Chester have roofs older than 15 years?",
);
await page.click("#ask");
await page.waitForTimeout(1800);
await show("#agent");
await say("Agent returns matching properties with source-backed evidence.");
await page.locator("#q").fill(
  "Which properties near that area have open roofing permits that have been open for many years, and who is the listed contractor?",
);
await page.click("#ask");
await page.waitForTimeout(1800);
await show("#agent");
await say("Agent returns long-open county permits, contractor names, BBB n/a, and states that municipal roofing UCC is not in the public harvest.");
await show("#sec-mcp");
await say("Finally, I will show that the system is MCP-ready. queryProperties and getPipelineRun are the contract the roofing CRM uses.", 3500);

await context.close();
await browser.close();

const files = (await readdir("demo/out")).filter((f) => f.endsWith(".webm") && !f.includes("transcript"));
if (files[0]) {
  await rename(join("demo/out", files[0]), join("demo/out", "oracle-demo-transcript.webm"));
}
console.log("wrote demo/out/oracle-demo-transcript.webm from", base);
