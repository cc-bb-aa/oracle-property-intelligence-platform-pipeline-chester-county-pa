import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { haversineMiles, ownerIsRegional, roofAgeYears } from "../../packages/schema/src/index.ts";

describe("roofAgeYears", () => {
  it("uses year built when present", () => {
    const r = roofAgeYears({ yearBuilt: 2000, lastRoofingCompletedAt: null, nowYear: 2026 });
    assert.equal(r.age, 26);
    assert.equal(r.basis, "year_built");
  });
  it("falls back to last roofing permit", () => {
    const r = roofAgeYears({
      yearBuilt: null,
      lastRoofingCompletedAt: "2006-01-01T00:00:00.000Z",
      nowYear: 2026,
    });
    assert.ok(r.age != null && r.age >= 19);
    assert.equal(r.basis, "last_roofing_permit");
  });
  it("unknown when no proxy", () => {
    const r = roofAgeYears({ yearBuilt: null, lastRoofingCompletedAt: null });
    assert.equal(r.age, null);
    assert.equal(r.basis, "unknown");
  });
});

describe("haversineMiles", () => {
  it("is ~0 at same point", () => {
    assert.ok(haversineMiles(39.96, -75.6, 39.96, -75.6) < 0.01);
  });
  it("west chester to ~5 miles is in range", () => {
    const d = haversineMiles(39.9607, -75.6055, 39.99, -75.55);
    assert.ok(d > 2 && d < 8);
  });
});

describe("ownerIsRegional", () => {
  it("flags out of state mailing", () => {
    assert.equal(ownerIsRegional("19380", "1 MAIN ST, NEWARK DE 19711"), true);
  });
  it("same zip is local", () => {
    assert.equal(ownerIsRegional("19380", "100 W GAY ST, WEST CHESTER PA 19380"), false);
  });
});
