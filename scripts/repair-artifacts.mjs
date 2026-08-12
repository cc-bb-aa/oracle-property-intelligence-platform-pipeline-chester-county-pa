import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const art = resolve(root, "data/artifacts");

function chesterZip(zip) {
  return typeof zip === "string" && /^(193|194)\d{2}$/.test(zip);
}

function isSentinel(iso) {
  if (!iso) return false;
  const y = new Date(iso).getUTCFullYear();
  return y < 1900 || y > new Date().getUTCFullYear() + 1;
}

const properties = JSON.parse(await readFile(resolve(art, "properties.json"), "utf8"));
const permits = JSON.parse(await readFile(resolve(art, "permits.json"), "utf8"));
const run = JSON.parse(await readFile(resolve(art, "pipeline-run.json"), "utf8"));

for (const p of properties) {
  if (p.roofAgeBasis === "last_construction_permit") {
    p.constructionAgeYears = p.roofAgeYears;
    p.roofAgeYears = null;
    p.roofAgeBasis = "unknown";
  }
  if (p.zip && !chesterZip(p.zip)) {
    p.mailingZip = p.mailingZip ?? p.zip;
    p.zip = undefined;
  }
  if (p.city && p.ownerMailing && String(p.ownerMailing).toUpperCase().includes(String(p.city).toUpperCase())) {
    p.mailingCity = p.mailingCity ?? p.city;
    delete p.city;
  }
}

for (const p of permits) {
  if (isSentinel(p.openedAt)) {
    p.openedAt = null;
    if (p.status === "open") p.status = "unknown";
    p.openDurationDays = null;
  }
  if (p.provenance?.sourceId === "chesco-act247-gis" || p.provenance?.sourceId === "chesco-energov-history") {
    p.contractorName = null;
    p.contractorId = null;
  }
}

const contractors = [];
const seen = new Set();
for (const p of permits) {
  if (!p.contractorName || seen.has(p.contractorName)) continue;
  seen.add(p.contractorName);
  contractors.push({
    contractorId: p.contractorId ?? p.contractorName,
    name: p.contractorName,
    bbbScore: null,
    bbbRating: null,
    provenance: p.provenance,
  });
}

run.duckdbPath = "data/duckdb/chester.duckdb";
const parcelCov = run.coverage?.find((c) => c.dataset === "parcels");
if (parcelCov && !/capped/.test(parcelCov.limitations || "")) {
  parcelCov.limitations = `West Chester 5mi envelope, capped at ${run.counts?.rawPasdaFeatures ?? properties.length} PASDA rows (OBJECTID page, not a complete 5-mile census). INGEST_MODE=full for the county.`;
}
run.counts = {
  ...run.counts,
  properties: properties.length,
  permits: permits.length,
  contractors: contractors.length,
};

await writeFile(resolve(art, "properties.json"), JSON.stringify(properties, null, 2));
await writeFile(resolve(art, "permits.json"), JSON.stringify(permits, null, 2));
await writeFile(resolve(art, "contractors.json"), JSON.stringify(contractors, null, 2));
await writeFile(resolve(art, "pipeline-run.json"), JSON.stringify(run, null, 2));

const pub = resolve(root, "apps/web/public/data");
await mkdir(pub, { recursive: true });
for (const name of ["properties.json", "permits.json", "contractors.json", "pipeline-run.json"]) {
  await copyFile(resolve(art, name), resolve(pub, name));
}

console.log(
  JSON.stringify(
    {
      properties: properties.length,
      permits: permits.length,
      contractors: contractors.length,
      roofAges: properties.filter((p) => p.roofAgeYears != null).length,
      constructionAges: properties.filter((p) => p.constructionAgeYears != null).length,
      openPermits: permits.filter((p) => p.status === "open").length,
    },
    null,
    2,
  ),
);
