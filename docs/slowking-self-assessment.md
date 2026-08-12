# Slowking self-assessment · Oracle Chester County pipeline

**Assignment:** Oracle Property Intelligence Platform Pipeline - Chester County, PA  
**PR:** https://github.com/prismteam-ai/oracle-property-intelligence-platform-pipeline-chester-county-pa/pull/2  
**Runtime:** https://cc-bb-aa.github.io/oracle-property-intelligence-platform-pipeline-chester-county-pa/  
**Demo:** `demo/out/oracle-demo-transcript.webm` + `demo/out/oracle-demo.mp4`  
**Credentials:** none  

## One-sentence business intent

Load real Chester County property intelligence (and roofing-lead signals) into a low-cost, MCP-ready query surface so a roofing CRM can find aged roofs and long-open permits by radius.

## Gates

| Gate | Status | Why |
|------|--------|-----|
| PR to designated repo | Pass | PR #2 against prismteam-ai/oracle-... |
| Hosted runtime | Pass | https://cc-bb-aa.github.io/oracle-property-intelligence-platform-pipeline-chester-county-pa/ |
| Credentials | Pass | Public, no login |
| Demo | Pass | Playwright webm + hyperframes MP4 in `demo/out/` |

## Scorecard (self, pre-grader)

| Dimension | Weight | Band | Points | Why |
|-----------|--------|------|--------|-----|
| Functional outcome | 40 | 75% | 30 | Real PASDA parcels + 952 real county GIS permits; 0 municipal roofing UCC (login-walled); BBB null |
| Runtime & demo quality | 20 | 100% | 20 | Hosted Pages runtime + Playwright walkthrough + hyperframes MP4 |
| Evidence quality | 12 | 100% | 12 | Provenance on every record; EnerGov/Act 247 source URLs; no adapter seeds |
| Access-boundary compliance | 8 | 100% | 8 | Public GIS only |
| Implementation quality | 7 | 100% | 7 | Skill-aligned stages, unit/integration/e2e, AC matrix |
| Kit-usage conformance | 5 | 75% | 4 | elephant discovery/adapter/publish names; soofi use-oracle; Filebase pin client present, creds absent |
| Reproducibility | 4 | 100% | 4 | CI + npm scripts + INGEST_MODE + MAX_PERMITS |
| Speed | 4 | 75% | 3 | Hosted cut inside 48h; harvest refresh same window |
| **Total** | 100 | | **88** | Honest ceiling without municipal roofing UCC + Filebase creds + BBB |

Verdict (self): **Partial Pass**. Runtime/demo/evidence gates are strong. Functional stays at 75% because roofing UCC and BBB are still unavailable as public bulk data.

## Functional outcome breakdown

| Point | Result |
|-------|--------|
| Chester coverage documented | Pass (primary; fallbacks listed unused) |
| Properties + coords loaded | Pass (2493 real PASDA West Chester slice) |
| Roof age query | Partial (200 last_construction_permit proxies; year built missing; 7 ≥ 15y) |
| Open roofing permits | Partial (153 open / 118 long-open **county** permits; 0 isRoofing) |
| Contractor + BBB | Partial (731 names from applicants; BBB null, no bulk API) |
| DuckDB / IPFS / MCP | Pass / Partial (DuckDB writer; real CIDv0 via ipfs-only-hash; Filebase pin needs FILEBASE_*) |
| Agent questions | Pass (deterministic tool path) |
| Explore UI | Pass |

## Honest gaps for the real Slowking run

- County Evolve + West Chester SmartGov building/roofing UCC are still not public-bulk. Do not claim municipal roofing harvest.
- Harvested permits are Health EnerGov well/sewage, Act 247 land-dev/subdivision, and EnerGov PermitManagement.
- Sunbiz N/A in PA.
- Default ingest is West Chester 5-mile slice, not all 194k parcels (full mode exists).
- Filebase pin client is implemented; this environment has no FILEBASE_* so pins are local CIDv0 (`Qm…`), not a Filebase gateway URL.
- 95/100 is not honest on this evidence. The missing 100% functional band is municipal roofing UCC (and BBB where available).
