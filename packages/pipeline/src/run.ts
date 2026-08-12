import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { PipelineRun } from "../../schema/src/index.ts";
import { queryLayer, westChesterBbox } from "./stages/pasda.ts";
import {
  applyRoofingPermitAge,
  businessesFromOwners,
  contractorsFromPermits,
  reconcileProperties,
  transformParcel,
} from "./stages/transform.ts";
import { loadPermitHarvest } from "./stages/permits.ts";
import { publishArtifact } from "./lib/ipfs.ts";
import { writeDuckDb } from "./lib/duckdb.ts";

const ROOT = resolve(process.env.ORACLE_ROOT ?? process.cwd());

export async function runPipeline(): Promise<PipelineRun> {
  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  const maxParcels = Number(process.env.MAX_PARCELS ?? 2500);
  const mode = process.env.INGEST_MODE ?? "west-chester-slice";
  const geom = mode === "full" ? undefined : westChesterBbox(5);

  await mkdir(resolve(ROOT, "data/artifacts"), { recursive: true });

  const skillStages = [
    "county-discovery",
    "county-seed-data",
    "county-appraisal-onboarding",
    "validate-county-transform",
    "county-permit-adapter",
    "bbb-harvest",
    "query-db-loading-matching",
    "county-open-data-publish",
  ];

  const raw = await queryLayer({
    layer: Number(process.env.PARCEL_LAYER ?? 11),
    geometry: geom,
    maxRecords: maxParcels,
  });

  const properties0 = reconcileProperties(
    raw.map(transformParcel).filter((x): x is NonNullable<typeof x> => Boolean(x)),
  );

  const permitSeed = resolve(ROOT, "data/seeds/permits-chester-pa.json");
  const harvest = await loadPermitHarvest(permitSeed, properties0, geom);
  const properties = properties0.map((p) => applyRoofingPermitAge(p, harvest.permits));
  const contractors = contractorsFromPermits(harvest.permits);
  const businesses = businessesFromOwners(properties);

  const propsPath = resolve(ROOT, "data/artifacts/properties.json");
  const permitsPath = resolve(ROOT, "data/artifacts/permits.json");
  const contractorsPath = resolve(ROOT, "data/artifacts/contractors.json");
  const businessesPath = resolve(ROOT, "data/artifacts/businesses.json");
  await writeFile(propsPath, JSON.stringify(properties, null, 2));
  await writeFile(permitsPath, JSON.stringify(harvest.permits, null, 2));
  await writeFile(contractorsPath, JSON.stringify(contractors, null, 2));
  await writeFile(businessesPath, JSON.stringify(businesses, null, 2));

  const duckdbPath = resolve(ROOT, "data/duckdb/chester.duckdb");
  let duckLimitation: string | undefined;
  try {
    await writeDuckDb({
      path: duckdbPath,
      properties,
      permits: harvest.permits,
      contractors,
      businesses,
    });
  } catch (err) {
    duckLimitation = `DuckDB native write failed (${String(err)}). JSON artifacts remain queryable.`;
  }

  const ipfs: PipelineRun["ipfs"] = [];
  for (const [name, path] of [
    ["properties.json", propsPath],
    ["permits.json", permitsPath],
    ["contractors.json", contractorsPath],
    ["businesses.json", businessesPath],
  ] as const) {
    const pub = await publishArtifact(
      path,
      resolve(ROOT, "data/ipfs", `${name}.json`),
      name,
    );
    ipfs.push(pub);
  }

  const finishedAt = new Date().toISOString();
  const run: PipelineRun = {
    runId,
    startedAt,
    finishedAt,
    primaryCounty: "Chester",
    fallbacksAttempted: [],
    coverage: [
      {
        dataset: "parcels",
        county: "Chester",
        isFallback: false,
        records: properties.length,
        sourceUrl:
          "https://mapservices.pasda.psu.edu/server/rest/services/pasda/ChesterCounty/MapServer/11",
        limitations:
          mode === "full"
            ? "Full PASDA layer (~194k). This run used pagination."
            : `West Chester ${5}mi slice (INGEST_MODE=${mode}). Full county: INGEST_MODE=full.`,
      },
      {
        dataset: "permits",
        county: "Chester",
        isFallback: false,
        records: harvest.permits.length,
        sourceUrl: harvest.source,
        limitations: harvest.limitations,
      },
      {
        dataset: "ownership",
        county: "Chester",
        isFallback: false,
        records: properties.filter((p) => p.ownerName).length,
        sourceUrl: "PASDA parcel OWN*/ADDR*/DEED_REC_D",
      },
      {
        dataset: "contractors",
        county: "Chester",
        isFallback: false,
        records: contractors.length,
        limitations: "BBB public bulk API not available; scores null unless harvested.",
      },
      {
        dataset: "businesses",
        county: "Chester",
        isFallback: false,
        records: businesses.length,
        limitations: "Sunbiz is Florida-only. PA uses commercial parcel owners.",
      },
      {
        dataset: "coordinates",
        county: "Chester",
        isFallback: false,
        records: properties.filter((p) => Number.isFinite(p.lat)).length,
      },
    ],
    counts: {
      properties: properties.length,
      permits: harvest.permits.length,
      contractors: contractors.length,
      businesses: businesses.length,
      rawPasdaFeatures: raw.length,
    },
    ipfs,
    duckdbPath,
    limitations: [
      harvest.limitations,
      "Year built not on PASDA parcel layer; roof age uses last roofing permit when present.",
      "Sunbiz not applicable in Pennsylvania.",
      "BBB scores require harvested seed; default null.",
      ...(duckLimitation ? [duckLimitation] : []),
    ],
    skillStages,
  };

  await writeFile(resolve(ROOT, "data/artifacts/pipeline-run.json"), JSON.stringify(run, null, 2));

  const publicDir = resolve(ROOT, "apps/web/public/data");
  await mkdir(publicDir, { recursive: true });
  for (const name of [
    "properties.json",
    "permits.json",
    "contractors.json",
    "businesses.json",
    "pipeline-run.json",
  ]) {
    await copyFile(resolve(ROOT, "data/artifacts", name), resolve(publicDir, name));
  }

  await writeFile(
    resolve(ROOT, "apps/web/public/mcp/tools.json"),
    JSON.stringify(
      {
        tools: [
          {
            name: "queryProperties",
            description: "Radius query over Chester County property intelligence.",
            inputSchema: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" },
                radiusMiles: { type: "number" },
                minRoofAgeYears: { type: "number" },
                openPermitsOnly: { type: "boolean" },
                openRoofingOnly: { type: "boolean" },
              },
            },
          },
          { name: "getPipelineRun", description: "Latest pipeline run summary." },
        ],
        runId: run.runId,
        counts: run.counts,
        note: "Hosted Pages runtime evaluates tools client-side against published artifacts. Node /mcp/call is available when the API is deployed.",
      },
      null,
      2,
    ),
  );

  return run;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("run.ts")) {
  runPipeline()
    .then((r) => {
      console.log(JSON.stringify({ ok: true, runId: r.runId, counts: r.counts }, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
