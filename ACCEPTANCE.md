# Acceptance matrix · Oracle Chester County pipeline

| ID | Criterion | Test | Status |
|----|-----------|------|--------|
| G1 | Chester County PA primary | `docs/chester-pa-sources.yaml`, run.coverage | in progress |
| G2 | Neighbor fallbacks documented | sources.yaml fallbacks | documented |
| G3 | Run summary states primary vs fallback | `/api/run` | in progress |
| D1 | Load property records | pipeline properties.json | in progress |
| D2 | Load roofing permits + open duration | real EnerGov/Act 247 harvest; roofing keyword-tagged | done |
| D3 | Ownership fields | properties.owner* | in progress |
| D4 | Contractors | contractors.json | in progress |
| D5 | BBB scores where available | contractors.bbb* (null if unharvested) | documented |
| D6 | Business records | businesses.json (PA substitute for Sunbiz) | documented |
| D7 | Coordinates | properties.lat/lng | in progress |
| D8 | Roof age / 15y proxy | roofAgeYears + last roofing permit | in progress |
| D9 | Reconcile duplicates | reconcileProperties unit | done |
| D10 | Provenance | provenance on every record | in progress |
| I1 | No default ongoing Oracle infra cost | DuckDB file + content-addressed artifacts + scale-to-zero host | in progress |
| I2 | IPFS / content ids | local CIDv0 via ipfs-only-hash (no Filebase pin client) | done |
| I3 | DuckDB query | writeDuckDb + JSON fallback | in progress |
| I4 | MCP-ready | `/mcp/tools` `/mcp/call` | in progress |
| I5 | Agent access | `/api/agent` | in progress |
| I6 | Explore UI | `apps/web/public` | in progress |
| Q1 | Radius query | queryProperties | done (unit) |
| Q2 | Roofs > 15y | query filter | done (unit) |
| Q3 | Open roofing permits / long-open | query filter | done (unit) |
| Q4 | Contractor + BBB on permit | query join | in progress |
| Q5 | Ownership > 10y | ownershipYears | in progress |
| Q6 | Regional / out-of-area owners | ownerIsRegional | done (unit) |
| DEM | Demo transcript | Playwright e2e + hosted runtime | in progress |
