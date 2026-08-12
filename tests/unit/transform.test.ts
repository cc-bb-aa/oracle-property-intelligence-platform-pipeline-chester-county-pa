import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cityFromPasda, siteZipFromAddress, transformParcel } from "../../packages/pipeline/src/stages/transform.ts";

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
    assert.equal(p.city, "ATLANTA");
  });
});
