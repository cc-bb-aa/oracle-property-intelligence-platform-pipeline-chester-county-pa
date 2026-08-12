import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { queryProperties, type Store } from "../../packages/shared/src/store.ts";
import type { Property, Permit } from "../../packages/schema/src/index.ts";

function prop(over: Partial<Property> = {}): Property {
  return {
    propertyId: "chester:1",
    upi: "1",
    address: "1 W Market St",
    lat: 39.9607,
    lng: -75.6055,
    yearBuilt: 1990,
    roofAgeYears: 36,
    roofAgeBasis: "year_built",
    lastSaleAmount: null,
    deedRecordedAt: "2000-01-01T00:00:00Z",
    ownershipYears: 26,
    ownerIsRegional: false,
    provenance: { sourceId: "t", collectedAt: "2026-01-01", county: "Chester" },
    ...over,
  };
}

function store(properties: Property[], permits: Permit[] = []): Store {
  return { run: null, properties, permits, contractors: [], businesses: [] };
}

describe("queryProperties", () => {
  it("filters by radius", () => {
    const far = prop({ propertyId: "far", lat: 40.2, lng: -75.1 });
    const rows = queryProperties(store([prop(), far]), {
      lat: 39.9607,
      lng: -75.6055,
      radiusMiles: 5,
    });
    assert.equal(rows.length, 1);
  });
  it("filters aged roofs", () => {
    const young = prop({ propertyId: "y", roofAgeYears: 5 });
    const rows = queryProperties(store([prop(), young]), {
      lat: 39.9607,
      lng: -75.6055,
      radiusMiles: 5,
      minRoofAgeYears: 15,
    });
    assert.equal(rows.length, 1);
  });
  it("filters open roofing permits", () => {
    const p = prop();
    const permit: Permit = {
      permitId: "p1",
      propertyId: p.propertyId,
      permitType: "roof",
      isRoofing: true,
      status: "open",
      openedAt: "2018-01-01T00:00:00Z",
      closedAt: null,
      openDurationDays: 2000,
      contractorName: "Acme",
      contractorId: "acme",
      provenance: { sourceId: "t", collectedAt: "2026-01-01", county: "Chester" },
    };
    const rows = queryProperties(store([p], [permit]), {
      lat: 39.9607,
      lng: -75.6055,
      radiusMiles: 5,
      openRoofingOnly: true,
      minOpenDays: 365,
    });
    assert.equal(rows.length, 1);
  });
});
