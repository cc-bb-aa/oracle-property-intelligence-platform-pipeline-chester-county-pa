import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { agentCaveats, parseAgentQuestion } from "../../packages/shared/src/agent.ts";

describe("parseAgentQuestion", () => {
  it("parses the official aged-roof prompt", () => {
    const q = parseAgentQuestion(
      "Which properties in Chester County within five miles of West Chester have roofs older than 15 years?",
    );
    assert.equal(q.minRoofAgeYears, 15);
    assert.equal(q.openPermitsOnly, false);
    assert.equal(q.openRoofingOnly, false);
    assert.equal(q.askedRoofingUcc, false);
  });

  it("answers official open-roofing prompt with county permits, not isRoofing", () => {
    const q = parseAgentQuestion(
      "Which properties near that area have open roofing permits that have been open for many years, and who is the listed contractor?",
    );
    assert.equal(q.openPermitsOnly, true);
    assert.equal(q.openRoofingOnly, false);
    assert.equal(q.askedRoofingUcc, true);
    assert.equal(q.minOpenDays, 365 * 3);
    assert.equal(q.minRoofAgeYears, undefined);
    assert.match(agentCaveats(true).join(" "), /not in the public harvest/);
  });
});
