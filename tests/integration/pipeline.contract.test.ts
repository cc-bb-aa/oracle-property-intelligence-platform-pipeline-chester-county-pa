import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.env.ORACLE_ROOT ?? process.cwd());

describe("pipeline artifacts contract", () => {
  it("documents sources and acceptance matrix", () => {
    assert.ok(existsSync(resolve(root, "docs/chester-pa-sources.yaml")));
    assert.ok(existsSync(resolve(root, "docs/chester-pa-county-findings.md")));
    assert.ok(existsSync(resolve(root, "ACCEPTANCE.md")));
  });
});
