import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyRoofingPermitAge, cityFromPasda, siteZipFromAddress, transformParcel } from "../../packages/pipeline/src/stages/transform.ts";

describe("site vs mailing zip", () => {
  it("reads site zip only from the situs address", () => {
    assert.equal(siteZipFromAddress("100 W GAY ST 19380"), "19380");
    assert.equal(siteZipFromAddress("4360 GLENVILLE RD"), undefined);
  });

  it("parses city from ADDR2, not a mailing-zip mash", () => {
    assert.equal(cityFromPasda("DOWNINGTOWN PA", "506 SUNSET DR, DOWNINGTOWN PA, 19335"), "DOWNINGTOWN");
  });

  it("flags out-of-state owners when PASDA ZIP1 is only the mailing zip", () => {
    const p = transformParcel({
      attributes: {
        UPI: "1-1-1",
        LOC_ADDRES: "1 FAKE ST",
        OWN1: "HOME DEPOT USA INC",
        ADDR1: "2455 PACES FERRY RD",
        ADDR2: "ATLANTA GA",
        ZIP1: "30339",
        CLASS: "C",
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
    });
    assert.ok(p);
    assert.equal(p.ownerIsRegional, true);
    assert.equal(p.city, undefined);
    assert.equal(p.zip, undefined);
    assert.equal(p.mailingCity, "ATLANTA");
    assert.equal(p.mailingZip, "30339");
    assert.match(p.ownerMailing ?? "", /ATLANTA/);
  });

  it("does not promote Act 247 construction to roofAgeYears", () => {
    const aged = applyRoofingPermitAge(
      {
        propertyId: "chester:1",
        upi: "1",
        address: "1 W MARKET",
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
      },
      [
        {
          permitId: "a",
          propertyId: "chester:1",
          permitType: "Act 247 land-development",
          isRoofing: false,
          status: "closed",
          openedAt: "2008-01-01T00:00:00.000Z",
          closedAt: "2010-01-01T00:00:00.000Z",
          openDurationDays: 730,
          contractorName: null,
          contractorId: null,
          provenance: { sourceId: "chesco-act247-gis", collectedAt: "2026-01-01", county: "Chester" },
        },
      ],
    );
    assert.equal(aged.roofAgeYears, null);
    assert.equal(aged.roofAgeBasis, "unknown");
    assert.ok((aged.constructionAgeYears ?? 0) >= 15);
  });
});
