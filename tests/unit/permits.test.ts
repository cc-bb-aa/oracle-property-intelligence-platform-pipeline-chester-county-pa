import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { esriIso } from "../../packages/pipeline/src/lib/gis.ts";
import {
  looksRoofing,
  mapPermitStatus,
  normalizeUpi,
  wellOrSewageToPermit,
  act247ToPermit,
} from "../../packages/pipeline/src/stages/permits.ts";
import type { Property } from "../../packages/schema/src/index.ts";

const property: Property = {
  propertyId: "chester:48-8-25.5",
  upi: "48-8-25.5",
  address: "427 W STREET RD",
  lat: 39.96,
  lng: -75.6,
  yearBuilt: null,
  roofAgeYears: null,
  roofAgeBasis: "unknown",
  lastSaleAmount: null,
  deedRecordedAt: null,
  ownershipYears: null,
  ownerIsRegional: null,
  provenance: { sourceId: "t", collectedAt: "2026-01-01", county: "Chester" },
};

describe("permit harvest mappers", () => {
  it("maps EnerGov health statuses", () => {
    assert.equal(mapPermitStatus("HD - Received"), "open");
    assert.equal(mapPermitStatus("HD - Approved"), "closed");
    assert.equal(mapPermitStatus("HD - Expired"), "closed");
    assert.equal(mapPermitStatus(""), "unknown");
  });

  it("tags roofing only on roof keywords", () => {
    assert.equal(looksRoofing("Roof replacement"), true);
    assert.equal(looksRoofing("Additional well"), false);
  });

  it("joins well permits on UPI and never uses adapter seed ids", () => {
    const byUpi = new Map([[normalizeUpi(property.upi), property]]);
    const permit = wellOrSewageToPermit(
      {
        attributes: {
          OBJECTID: 1,
          Permit_ID: "074095",
          UPI: "48-8-25.5",
          Permit_Status: "HD - Expired",
          Work_Class: "Additional",
          AppDate: 1551878997943,
          Applicant1: "Kevin Murphy",
          Site_Address: "427 W STREET RD",
        },
      },
      byUpi,
      "well",
      "https://gisprodops.chesco.org/server/rest/services/EnerGov_Services/EnerGov_Data_D_CL2/MapServer/11",
    );
    assert.ok(permit);
    assert.equal(permit.propertyId, property.propertyId);
    assert.equal(permit.status, "closed");
    assert.equal(permit.isRoofing, false);
    assert.equal(permit.provenance.sourceId, "chesco-energov-well");
    assert.ok(!permit.permitId.startsWith("seed-roof-"));
  });

  it("treats unsigned Act 247 plans as open land-dev, not synthetic roofing", () => {
    const permit = act247ToPermit(
      {
        attributes: {
          OBJECTID: 1,
          PLAN_NUM: "LD-01-17-14648",
          PLAN_TITLE: "Devon Yard",
          SUBMIT_DATE: 1482883200000,
          DESCRIPTION: "construct 3 commercial buildings",
          PRIMARY_CODE: "Retail",
        },
        geometry: {
          rings: [
            [
              [-75.6055, 39.9607],
              [-75.605, 39.9607],
              [-75.605, 39.961],
              [-75.6055, 39.961],
              [-75.6055, 39.9607],
            ],
          ],
        },
      },
      [property],
      "land-development",
      "https://gisprodops.chesco.org/server/rest/services/Planning_Services/Plan_Act247_AGOL_D/MapServer/2",
    );
    assert.ok(permit);
    assert.equal(permit.status, "open");
    assert.equal(permit.isRoofing, false);
    assert.equal(permit.provenance.sourceId, "chesco-act247-gis");
    assert.match(permit.permitType, /Act 247/);
    assert.equal(permit.contractorName, null);
  });

  it("rejects EnerGov sentinel years", () => {
    assert.equal(esriIso("2999-01-01T00:00:00.000Z"), null);
    assert.ok(esriIso("2017-01-03T00:00:00.000Z"));
  });
});
