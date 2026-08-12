# Slowking evaluation — Oracle Property Intelligence Platform Pipeline (Chester County, PA)

**Assignment:** Oracle Property Intelligence Platform Pipeline — Chester County, PA  
**Designated repo:** https://github.com/prismteam-ai/oracle-property-intelligence-platform-pipeline-chester-county-pa  
**Candidate PR:** https://github.com/prismteam-ai/oracle-property-intelligence-platform-pipeline-chester-county-pa/pull/2  
**Head evaluated:** `87d918f9e3eb45254ebb9238b2ac706c901a8923` (2026-08-12T18:52:43Z)  
**Hosted runtime exercised:** https://cc-bb-aa.github.io/oracle-property-intelligence-platform-pipeline-chester-county-pa/  
**Pages last-modified:** 2026-08-12 18:53:27Z (HTML/JSON). Deploy message `deploy: e87d1193…` 18:56:23Z.  
**Demo:** `demo/out/oracle-demo-transcript.webm` (4 134 047 B, 54.0s, hosted walkthrough with presenter captions).  
**Credentials:** none (public)

## Verdict

Partial Pass

## Total score

86/100

## Scorecard

| Dimension | Weight | Band | Points | Why |
|---|---|---|---|---|
| Functional outcome | 40 | — | 29 | Sum of per-point scores. Real Chester PASDA + EnerGov/Act 247; 0 municipal roofing UCC, 0 BBB, 0 year-built roof age; 2500-row PASDA cap. |
| Runtime & demo quality | 20 | 100% | 20 | Pages exercised end-to-end (curl + Playwright, not localhost). Hosted e2e 4/4 in 6.5s. 54s webm walks the official transcript on the live harvest. |
| Evidence quality | 12 | 100% | 12 | Live JSON + UI + both official agents + matching demo observed. Provenance URLs are live PASDA/Chesco MapServers. No invented Filebase pins. |
| Access-boundary compliance | 8 | 100% | 8 | Public PASDA/Chesco GIS only. Seeds dir empty; 0 `seed-roof-*`. Login-walled UCC left unharvested. Live CIDs are `ipfs-only-hash` Qm… (Filebase gateway 504 / ipfs.io timeout). |
| Implementation quality | 7 | 75% | 5 | Skill-shaped TS pipeline, Zod, GIS pagination, unit/integration/e2e. Review closeables landed. Remaining: Act 247 nearest-join pile-up, keyword agent, stale coverage 714 vs 356 contractors. |
| Kit-usage conformance | 5 | 75% | 4 | elephant-xyz `county-discovery` / `county-permit-adapter` / publish + soofi `use-oracle` path; stages extended for Chester Pages, not a kit rewrite and not a Neon/IPNS drive. |
| Reproducibility | 4 | 100% | 4 | PR is system of record; Pages URL in README/PR; `INGEST_MODE` / `MAX_PARCELS` documented. Live `mcp/tools.json` `runId` equals `pipeline-run.json`. |
| Speed | 4 | 100% | 4 | Assignment sent 2026-08-12; latest commit same calendar day 18:52:43Z (first PR commit 15:56:38Z; ~3h of head commits). |
| **Total** | **100** | | **86** | |

## Functional Outcome Breakdown

| Evaluation point | Sub-weight | Band | Points | Evidence / why |
|---|---|---|---|---|
| Chester coverage + honest run summary | 5 | 75% | 4 | Hosted KPIs **2493 / 952 / 136 open / 356 contractors**. Primary Chester; Montgomery/Delaware/Bucks unused. Limitations name Evolve/SmartGov, Sunbiz FL-only, BBB null, 2500 PASDA cap. Coverage table still lists **714** contractors vs live file **356**. |
| Properties + ownership + coordinates | 7 | 75% | 5 | Live: **2493** PASDA parcels, **2484** owners, **2493** coords, **1395** ownership≥10y, **`ownerIsRegional=47`** (HOME DEPOT Atlanta GA; EXTON PA COFFEE Farmington Hills MI). PASDA `returnCountOnly` on the same 5mi envelope = **42 326** → hosted cut is **~5.9%** of the 5mi envelope (OBJECTID page, not a census). |
| Aged-roof lead query (≥15y) | 7 | 50% | 4 | Hosted UI: **5 matches**. All labeled `land-dev 15y (not roof)`. `yearBuilt` null on every parcel; `roofAgeYears` set on **0/2493**; `constructionAgeYears` set on 200, ≥15 on 7 countywide. 3 ROSE LA / UPI `52-5C-220` is Act 247 **Parking Lot/Garage**. |
| Open + long-open county permits | 7 | 75% | 5 | Live: **952** GIS permits, 0 `seed-roof-*`, 0 `isRoofing`. Sources: Act 247 460, sewage 280, well 161, EnerGov history 51. **136** open / **118** long-open (≥365d). Hosted UI: open **74**, open≥1y **64** (700 E GAY ST open 1736d). Municipal roofing UCC not harvested. |
| Official agent prompts + UCC caveat | 6 | 100% | 6 | Agent #1 → **5** + land-dev / no-year-built caveat + PASDA provenance. Agent #2 → **51** (`minOpenDays=1095`, `openRoofingOnly=false`) with Evolve/SmartGov + “showing long-open county permits instead.” Evidence includes UPI, miles, permitType, sourceId. |
| Contractor + BBB + business layer | 4 | 50% | 2 | Live: **356** applicant names (Act 247 / EnerGov-history `contractorName` now **null**, not plan titles). **0/356** BBB. **89** commercial-owner businesses. Sunbiz correctly FL-only. |
| DuckDB / IPFS / MCP-ready | 4 | 75% | 3 | UI + `/mcp/tools.json` 200; tools `queryProperties` + `getPipelineRun`; `runId` **a08ba375-…** matches pipeline-run. CIDs `QmR6Z5…` / `QmRG3g…` / `QmfBFi…` / `QmVmZ6…` are `ipfs-only-hash` (no Filebase pin). Hosted query is browser JSON; `duckdbPath` is relative `data/duckdb/chester.duckdb` (no `.duckdb` on Pages). |
| **Functional outcome subtotal** | **40** | | **29** | |

## Gates

| Gate | Status | Reason |
|---|---|---|
| PR to designated repo | **Pass** | Open PR #2 `feat/chester-county-pipeline` → `prismteam-ai/oracle-property-intelligence-platform-pipeline-chester-county-pa` (`cc-bb-aa`). Head `87d918f9`. |
| Deployed runtime | **Pass** | GitHub Pages HTTP 200. Exercised via curl, live JSON, and Playwright against the Pages URL only. Not localhost. |
| Credentials | **Pass** | Public; no login. |
| Demo artifact | **Pass** | Reachable on the PR branch: webm 4.1 MB / 54s. Frames show 2493/952/136/356, 5 aged land-dev rows, 64 open≥1y, agent #2 = 51 + UCC caveats, Qm CIDs, MCP caption. |

## Hiring signal

**Strengths**
- Honest county discovery (`docs/chester-pa-sources.yaml` / findings): PASDA ~194k, Evolve login wall, Sunbiz FL-only, BBB no bulk.
- Real Chesco GIS harvest (EnerGov well/sewage, Act 247, EnerGov history) joined on UPI / nearest parcel; adapter seeds gone.
- Candidate-deployed hosted runtime that answers radius / aged-proxy / long-open queries over thousands of real parcels.
- Closed review findings on the live site: `constructionAgeYears` not sold as roof age; Act 247 contractors no longer plan titles; regional owners; MCP `runId`; HTML-escaped GIS fields; relative `duckdbPath`.
- 54s demo now matches the hosted harvest and walks the official transcript.

**Weaknesses**
- Roofing-CRM intent is still only half-served: **0** roofing UCC, **0** BBB, **0** `roofAgeYears`. The ≥15y list is five land-dev proxies.
- 2500-row PASDA page is ~6% of the 5mi envelope (42 326). Radius answers are not a 5-mile census.
- Act 247 nearest-parcel join still piles neighboring plans onto 700 E GAY ST.
- Coverage.records (714 contractors) was not rewritten after plan-title stripping.
- Keyword agent, not RAG. MCP is a static catalog + client-side eval on Pages.

**Material risks**
- A roofing CRM that filters `isRoofing` or trusts `roofAgeYears` will see an empty / misleading lead list.
- Content IDs are local `ipfs-only-hash` values, not live Filebase/IPFS pins.
- Hosted query is JSON in the browser; DuckDB is a local/portable file, not a Pages artifact.

**Follow-up questions**
1. How would you get municipal roofing UCC (Evolve / West Chester SmartGov) without synthesizing rows or violating the login wall?
2. Will you paginate the remaining ~40k parcels in the 5mi envelope, or keep the 2500 OBJECTID page as the hosted cut?
3. Will you pin the live Qm CIDs to Filebase/IPNS, or keep them as local `ipfs-only-hash`?
4. How will you stop Act 247 nearest-join from attaching many neighbors’ plans to 700 E GAY ST?

## Detail

**Intent:** A roofing CRM operator can query real Chester County property intelligence (aged roofs, long-open roofing permits, contractors, ownership, coordinates) from a low-cost, MCP-ready surface so lead lists are source-backed.  
**Proven?** Partially. Public GIS scale and the hosted query/agent path are real; roofing-specific signals are not.

**What worked (hosted, observed 2026-08-12T18:56–19:00Z)**  
- GET `/` 200; `/data/pipeline-run.json` 200 last-modified 18:53:27Z; runId `a08ba375-b4fc-47f3-b05b-7a9e22717b27`.  
- Counts: properties 2493, permits 952, contractors 356, businesses 89, ownership 2484, coordinates 2493, open 136.  
- Playwright on Pages: stock e2e **4/4** in 6.5s. Custom drive: aged **5**, open **74**, open≥1y **64**, roofing-tagged **0**.  
- Agent #1: “5 matching properties…”, evidence includes UPI, miles, `roofAgeBasis=unknown`, PASDA `sourceUrl`, land-dev caveat.  
- Agent #2: “51 matching properties…”, caveats name Evolve/SmartGov + “no roofing-tagged rows.” First row 700 E GAY ST / 1736d Act 247 apartment; `contractor` null.  
- `/mcp/tools.json` 200; `runId` matches. `/api/run` 404 (expected static-host fallback).  
- PASDA layer 11 envelope count **42326**; hosted 2500-row cap documented.

**What failed / was thin**  
- **0** `isRoofing`; **0** `yearBuilt`; **0** `roofAgeYears`; BBB **0**.  
- Roof-age UI is an honest land-dev proxy (5 usable 5mi rows).  
- Live IPFS: cid-only Qm…; `ipfs.filebase.io` 504; `ipfs.io` timeout. **No Filebase pins claimed.**  
- DuckDB not on Pages. Coverage.contractors 714 disagrees with counts/file 356.  
- Demo walks the transcript; MCP catalog is collapsed until opened.

**Access boundaries:** Public GIS only. Seeds dir empty. Login-walled UCC left unharvested and labeled. No Neon/blob bypass because those surfaces were not used. Cost model is GitHub Pages + JSON + optional local DuckDB (assignment-appropriate; no always-on warehouse).

**Timing:** Assignment sent 2026-08-12. First PR commit 2026-08-12T15:56:38Z; latest 2026-08-12T18:52:43Z (`fix: close review findings on harvest, query, API, and hosted UI`). Same-day delivery.

**Implementation / kit notes (read-only clone at `87d918f9`)**  
- Layout: `packages/pipeline` (pasda, permits, transform, duckdb, ipfs) + `schema` + `shared/{store,agent}` + static `apps/web/public` + optional Express `/api` + `/mcp/call` bound to 127.0.0.1.  
- Expected toolchain (arceus / README / `oracle` + `use-oracle`): drive elephant `county-discovery` / `county-permit-adapter` / publish; baseline `apply-engineering-guidelines`.  
- Consulted read-only (no repo edits): Oracle ~78 (discovery + honest gaps + Chester stage extension). Guidelines ~70 (TS + CI tests; node:test not Vitest; Pages instead of CDK — fits the no-ongoing-cost AC).  
- Built-with-kit: **yes, extended** — skill stage names and `use-oracle` operating contract; not a rewrite of elephant/soofi, and not a full `onboard-county` → Neon → Filebase IPNS run.

**AC probes (hosted):** G1/G3 Partial (Chester yes, slice not full). D1/D3/D7 Pass. D2 Partial (real permits, 0 roofing UCC). D4 Partial. D5 Fail (BBB null). D6 Partial (commercial owners). D8 Partial (land-dev proxy). D9/D10 Pass (UPI reconcile + provenance). I1 Pass (Pages scale-to-zero). I2 Partial (CIDv0, not pinned). I3 Partial (JSON query, not hosted DuckDB). I4/I5/I6 Pass/Partial (static MCP + keyword agent + explore UI). Q1 Pass. Q2 Partial. Q3 Fail for roofing / Pass for county long-open. Q4 Partial (health-applicant names yes; Act 247 contractor null; BBB no). Q5 Pass (data present; UI has no ownership filter). Q6 Pass (47 regional). DEM Pass (54s hosted transcript).
