import { chromium } from "@playwright/test";
import { mkdir, rename, readdir, unlink } from "node:fs/promises";
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

async function injectChrome() {
  await page.evaluate(() => {
    document.documentElement.style.scrollPaddingBottom = "150px";
    if (!document.getElementById("demo-caption")) {
      const cap = document.createElement("div");
      cap.id = "demo-caption";
      cap.style.cssText =
        "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483646;background:#1e2a33;color:#f4f7f8;padding:16px 20px 16px 18px;border-radius:4px;font:600 20px/1.35 'IBM Plex Sans',ui-sans-serif,system-ui;box-shadow:0 10px 28px #0009;border-left:6px solid #a85b2a;pointer-events:none";
      const beat = document.createElement("div");
      beat.id = "demo-beat";
      beat.style.cssText =
        "font:600 12px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#c9b07a;margin-bottom:6px";
      const body = document.createElement("div");
      body.id = "demo-caption-text";
      cap.append(beat, body);
      document.body.appendChild(cap);
    }
    if (!document.getElementById("demo-cursor")) {
      const cursor = document.createElement("div");
      cursor.id = "demo-cursor";
      cursor.innerHTML =
        '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="#fff" stroke="#1e2a33" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      cursor.style.cssText =
        "position:fixed;z-index:2147483647;pointer-events:none;width:28px;height:28px;left:0;top:0;filter:drop-shadow(1px 1px 2px #0006)";
      document.body.appendChild(cursor);
      document.addEventListener("mousemove", (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      });
    }
    if (!document.getElementById("demo-hl-style")) {
      const st = document.createElement("style");
      st.id = "demo-hl-style";
      st.textContent =
        ".demo-hl{outline:3px solid #a85b2a !important;outline-offset:4px;box-shadow:0 0 0 8px rgba(168,91,42,.22);position:relative;z-index:4}";
      document.head.appendChild(st);
    }
  });
}

async function say(beat, text, ms = 3400) {
  await page.evaluate(
    ({ beat, text }) => {
      const b = document.getElementById("demo-beat");
      const t = document.getElementById("demo-caption-text");
      if (b) b.textContent = beat;
      if (t) t.textContent = text;
    },
    { beat, text },
  );
  await page.waitForTimeout(ms);
}

async function highlight(sel) {
  await page.evaluate((sel) => {
    document.querySelectorAll(".demo-hl").forEach((el) => el.classList.remove("demo-hl"));
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.add("demo-hl");
    el.scrollIntoView({ block: "center", behavior: "instant" });
  }, sel);
  await page.waitForTimeout(400);
}

async function moveTo(sel) {
  const el = page.locator(sel).first();
  const box = await el.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + Math.min(box.width / 2, 80), box.y + Math.min(box.height / 2, 40), {
    steps: 12,
  });
  await page.waitForTimeout(350);
}

async function clickSel(sel) {
  await moveTo(sel);
  await page.locator(sel).first().click();
  await page.waitForTimeout(400);
}

await page.goto(base, { waitUntil: "load", timeout: 45000 });
await page.locator("#run").waitFor({ state: "attached", timeout: 30000 });
await page.waitForFunction(
  () => (document.getElementById("run")?.textContent || "").length > 80,
  null,
  { timeout: 30000 },
);
await injectChrome();

await highlight("header");
await say(
  "Beat 1 of 11 · Intent",
  "I will demonstrate that the Oracle pipeline has loaded the available dataset for Chester County, Pennsylvania — or a documented neighboring-county fallback — that the data is queryable through DuckDB, that eligible artifacts are stored through IPFS, and that both the UI and agent can answer property intelligence questions that support roofing lead generation.",
  5600,
);

await highlight("#sec-run");
await moveTo("#coverage");
await say(
  "Beat 2 of 11 · Pipeline run summary",
  "First, I am opening the pipeline run summary.",
  2800,
);
await say(
  "Beat 2 of 11 · Expected",
  "Completed run, source list, Chester vs Montgomery / Delaware / Bucks unused, record counts, timestamps, and documented source limitations.",
  4200,
);

await highlight("#sec-counts");
await moveTo("#bySource");
await say("Beat 3 of 11 · Records by source", "Show the total uploaded records by source.", 2600);
await say(
  "Beat 3 of 11 · Expected",
  "Properties, permits, ownership, contractors (BBB where available), businesses, and coordinates with collection timestamps and provenance.",
  4200,
);

await highlight("#sec-duckdb");
await moveTo("#duckdb");
await say("Beat 4 of 11 · DuckDB query layer", "Now I am opening the DuckDB-backed query layer.", 2800);
await say(
  "Beat 4 of 11 · Expected",
  "Loaded data is available for structured querying without Oracle-hosted database infrastructure.",
  3800,
);

await highlight("#sec-ipfs");
await page.locator("#sec-ipfs details").evaluate((el) => {
  el.open = true;
});
await moveTo("#ipfs");
await say("Beat 5 of 11 · IPFS artifacts", "Show the IPFS artifacts created for the uploaded datasets.", 2800);
await say(
  "Beat 5 of 11 · Expected",
  "IPFS references / content identifiers for eligible dataset artifacts (CIDv0).",
  3800,
);

await highlight("#sec-query");
await say(
  "Beat 6 of 11 · UI aged roofs",
  "Using the UI, show properties within a sample radius that have roofs older than 15 years.",
  3000,
);
await clickSel("#aged");
await page.locator("#open").uncheck().catch(() => {});
await clickSel("#query");
await page.waitForTimeout(1200);
await highlight("#table");
await moveTo("#table");
await say(
  "Beat 6 of 11 · Expected",
  "Matching properties with roof-age basis (or labeled land-dev proxy), coordinates, and source provenance.",
  4200,
);

await highlight("#sec-query");
await say(
  "Beat 7 of 11 · UI long-open permits",
  "Show properties in that area with open roofing permits, prioritizing permits that have remained open for many years, including contractor and BBB rating where available.",
  4200,
);
await page.locator("#aged").uncheck().catch(() => {});
await clickSel("#open");
await clickSel("#longOpen");
await clickSel("#query");
await page.waitForTimeout(1200);
await highlight("#table");
await moveTo("#table table");
await say(
  "Beat 7 of 11 · Expected",
  "Permit status and open duration, contractor identity, BBB when present, and clear source backing.",
  4200,
);

await highlight("#sec-agent");
await say("Beat 8 of 11 · Agent", "Now I am asking the same type of questions through the agent.", 2800);

await moveTo("#q");
await page.locator("#q").fill("");
await page.locator("#q").pressSequentially(
  "Which properties in Chester County within five miles of West Chester have roofs older than 15 years?",
  { delay: 12 },
);
await clickSel("#ask");
await page.waitForTimeout(1400);
await highlight("#agent");
await moveTo("#agent");
await say(
  "Beat 9 of 11 · Agent prompt 1",
  "Agent returns matching properties, explains the reasoning, and includes source-backed evidence.",
  4200,
);

await highlight("#sec-agent");
await moveTo("#q");
await page.locator("#q").fill("");
await page.locator("#q").pressSequentially(
  "Which properties near that area have open roofing permits that have been open for many years, and who is the listed contractor?",
  { delay: 12 },
);
await clickSel("#ask");
await page.waitForTimeout(1400);
await highlight("#agent");
await moveTo("#agent");
await say(
  "Beat 10 of 11 · Agent prompt 2",
  "Filtered list with permit age / open duration, contractor details, BBB when available, and assumptions or missing data (UCC not public, BBB n/a).",
  4600,
);

await page.evaluate(() => {
  document.querySelectorAll(".demo-hl").forEach((n) => n.classList.remove("demo-hl"));
  document.querySelectorAll("header, main > section:not(#sec-mcp)").forEach((el) => {
    el.style.display = "none";
  });
  const sec = document.getElementById("sec-mcp");
  const details = document.querySelector("#sec-mcp details");
  if (details) details.open = true;
  if (sec) {
    sec.classList.add("demo-hl");
    sec.style.minHeight = "72vh";
  }
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
});
await page.waitForTimeout(500);
await moveTo("#sec-mcp h2");
await say("Beat 11 of 11 · MCP-ready", "Finally, I will show that the system is MCP-ready.", 3200);
await moveTo("#mcp");
await say(
  "Beat 11 of 11 · Expected",
  "MCP-ready interface: queryProperties and getPipelineRun. Agents and the roofing CRM use this contract without changing the data model.",
  5200,
);

await context.close();
await browser.close();

const files = (await readdir("demo/out")).filter((f) => f.endsWith(".webm") && !f.includes("transcript"));
if (files[0]) {
  const dest = join("demo/out", "oracle-demo-transcript.webm");
  try {
    await unlink(dest);
  } catch {}
  await rename(join("demo/out", files[0]), dest);
}
console.log("wrote demo/out/oracle-demo-transcript.webm from", base);
