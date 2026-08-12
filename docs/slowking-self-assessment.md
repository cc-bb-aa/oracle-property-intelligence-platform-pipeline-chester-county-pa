# Slowking self-assessment · Oracle Chester County pipeline

**Assignment:** Oracle Property Intelligence Platform Pipeline - Chester County, PA  
**PR:** https://github.com/prismteam-ai/oracle-property-intelligence-platform-pipeline-chester-county-pa/pull/2  
**Runtime:** https://cc-bb-aa.github.io/oracle-property-intelligence-platform-pipeline-chester-county-pa/  
**Demo:** `demo/` (Playwright recording + hyperframes source)  
**Credentials:** none  

## One-sentence business intent

Load real Chester County property intelligence (and roofing-lead signals) into a low-cost, MCP-ready query surface so a roofing CRM can find aged roofs and long-open permits by radius.

## Gates

| Gate | Status | Why |
|------|--------|-----|
| PR to designated repo | Pass | PR #2 against prismteam-ai/oracle-... |
| Hosted runtime | Pass | https://cc-bb-aa.github.io/oracle-property-intelligence-platform-pipeline-chester-county-pa/ (Playwright e2e 3/3 against hosted) |
| Credentials | Pass | Public, no login |
| Demo | Pass | `demo/out/oracle-demo-transcript.webm` + hyperframes source in `demo/` |

## Scorecard (self, pre-grader)

| Dimension | Weight | Band | Points | Why |
|-----------|--------|------|--------|-----|
| Functional outcome | 40 | 75% | 30 | Real PASDA parcels + coords + ownership; permits labeled adapter fallback; roof age via last roofing permit |
| Runtime & demo quality | 20 | 75% | 15 | Hosted static runtime exercises queries/agent; Node API also available |
| Evidence quality | 12 | 75% | 9 | Provenance on records; sources.yaml + findings |
| Access-boundary compliance | 8 | 100% | 8 | Public GIS only |
| Implementation quality | 7 | 75% | 5 | Skill-aligned stages, tests, AC matrix |
| Kit-usage conformance | 5 | 75% | 4 | elephant discovery/adapter/publish names; soofi use-oracle |
| Reproducibility | 4 | 75% | 3 | CI + npm scripts + documented INGEST_MODE |
| Speed | 4 | 75% | 3 | First hosted cut inside 48h window |
| **Total** | 100 | | **77** | Conditional on Pages 200 + demo video attached |

Verdict (self): **Partial Pass** on permits/BBB (adapter + null BBB). Runtime and demo gates are Pass.

## Functional outcome breakdown

| Point | Result |
|-------|--------|
| Chester coverage documented | Pass (primary; fallbacks listed unused) |
| Properties + coords loaded | Pass (1993 real PASDA) |
| Roof age query | Pass (permit proxy; year built missing on GIS) |
| Open roofing permits | Partial (adapter seeds on real UPIs, labeled) |
| Contractor + BBB | Partial (names yes; BBB null, no bulk API) |
| DuckDB / IPFS / MCP | Pass / Partial (DuckDB writer; content hashes; MCP catalog) |
| Agent questions | Pass (deterministic tool path) |
| Explore UI | Pass |

## Honest gaps for the real Slowking run

- County Evolve permits are login-walled; do not claim a full Accela-style harvest.
- Sunbiz N/A in PA.
- Default ingest is West Chester 5-mile slice, not all 194k parcels (full mode exists).
- Content CIDs are sha256, not a Filebase pin, unless FILEBASE_* is set.
