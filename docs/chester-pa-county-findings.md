# Chester County, PA · county discovery (elephant `county-discovery`)

Primary county: **Chester, Pennsylvania**. Fallbacks if a source is missing: Montgomery, Delaware, Bucks.

## 1. Appraiser / assessment portal

- **ChescoViews** parcel search: https://arcweb.chesco.org/cv4/ (address, owner, UPI, PIN).
- Official GIS: https://www.chesco.org/3486/GIS-Data
- **Bulk GIS (preferred seed):** PASDA Chester County Parcels 202604
  - REST: `https://mapservices.pasda.psu.edu/server/rest/services/pasda/ChesterCounty/MapServer/11`
  - Download zip: `https://www.pasda.psu.edu/download/chester/ChesterCounty/ChesterCounty_Parcels202604.zip`
  - Count probe: **194,286** parcels. `maxRecordCount` 1000. Geometry polygons; we persist **centroids** for radius search.
- Access mode: **plain HTTP REST** (no browser flow for PASDA MapServer). Good seed source.

Parcel identifier: **UPI** (e.g. `26-3J-83`) plus PIN variants (`PIN_COMMON`, `PIN_ASMNT`).

Fields used: `LOC_ADDRES`, `OWN1`/`OWN2`, mailing `ADDR*`, `ZIP1`, `DEED_REC_D`, `LAST_SALE_`, `LUC`, `CLASS`, polygon centroid.

**Year built is not on the PASDA parcel layer.** Roof age uses last roofing permit completion when present (`roofAgeBasis=last_roofing_permit`).

## 2. Permit portal

- County: **InfoVision Evolve** https://evolvepublic.infovisionsoftware.com/chester/ (account required).
- Permits are **fragmented by municipality** (West Chester borough, townships). Not a single Accela county agency like Lee County FL.
- Adapter: `packages/pipeline/src/stages/permits.ts`
  - Prefer `data/seeds/permits-chester-pa.json` harvested extract.
  - Fallback seeds attach **labeled** roofing permits to real PASDA UPIs so CRM/radius demos work. Provenance states they are not a county bulk extract.

## 3. Bulk sources

| Dataset | Source | Mode |
|---------|--------|------|
| Parcels / ownership / coords | PASDA MapServer layer 11 | REST pagination |
| Addresses | PASDA layer 12 | available, not required if parcels have LOC_ADDRES |
| Buildings | PASDA layer 14 (2015 footprints) | optional age proxy later |
| Permits | Evolve + municipal portals | harvest / adapter |
| BBB | no public bulk | null unless seed |
| Business / corporate | Sunbiz is **FL-only** | commercial parcel owners |

## 4. Usage vocabulary

PASDA `CLASS`: `R` residential, `C` commercial, `I` industrial (observed). `LUC` e.g. `R-10`.

## 5. Feasibility

- Full county parcel download via REST: ~194k / 200 per page ≈ 1000 requests. Slice mode (`INGEST_MODE=west-chester-slice`, 5 miles, `MAX_PARCELS=2500`) is the 48h default.
- PASDA is US-public; no geo-block observed from this environment.
- Evolve login blocks unattended full permit harvest in 48h.

## 6. Risks

- Municipal permit fragmentation.
- No year-built on GIS parcel file.
- BBB/Sunbiz not drop-in for PA.
- Hosted runtime required for slowking (not localhost-only).
