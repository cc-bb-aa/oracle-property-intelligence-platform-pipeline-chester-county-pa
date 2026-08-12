import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.env.ORACLE_ROOT ?? process.cwd());

describe("pipeline artifacts contract", () => {
  it("documents sources and acceptance matrix", () => {
    assert.ok(existsSync(resolve(root, "docs/chester-pa-sources.yaml")));
    assert.ok(existsSync(resolve(root, "docs/chester-pa-county-findings.md")));
    assert.ok(existsSync(resolve(root, "ACCEPTANCE.md")));
  });

  it("mcp tools runId matches the published pipeline run", () => {
    const run = JSON.parse(readFileSync(resolve(root, "apps/web/public/data/pipeline-run.json"), "utf8"));
    const tools = JSON.parse(readFileSync(resolve(root, "apps/web/public/mcp/tools.json"), "utf8"));
    assert.equal(tools.runId, run.runId);
    assert.ok(tools.counts?.permits > 100);
  });

  it("published permits are a real GIS harvest, not adapter seeds", () => {
    const path = resolve(root, "apps/web/public/data/permits.json");
    assert.ok(existsSync(path));
    const permits = JSON.parse(readFileSync(path, "utf8")) as Array<{
      permitId: string;
      provenance: { sourceId: string };
    }>;
    assert.ok(permits.length > 100, `expected a county-scale harvest, got ${permits.length}`);
    assert.equal(permits.filter((p) => p.permitId.startsWith("seed-roof-")).length, 0);
    const sources = new Set(permits.map((p) => p.provenance.sourceId));
    assert.ok([...sources].every((s) => s.startsWith("chesco-")));
  });
});
