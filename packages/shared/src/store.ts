import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  type Business,
  type Contractor,
  type Permit,
  type PipelineRun,
  type Property,
  BusinessSchema,
  ContractorSchema,
  PermitSchema,
  PipelineRunSchema,
  PropertySchema,
  haversineMiles,
} from "../../schema/src/index.ts";
import { z } from "zod";

export type Store = {
  run: PipelineRun | null;
  properties: Property[];
  permits: Permit[];
  contractors: Contractor[];
  businesses: Business[];
  source: "artifacts" | "missing";
};

const root = () => resolve(process.env.ORACLE_ROOT ?? process.cwd());

async function loadJson<T>(rel: string, fallback: T, schema?: z.ZodType<T>): Promise<T> {
  const candidates = [resolve(root(), rel), resolve(root(), rel.replace("data/artifacts/", "apps/web/public/data/"))];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const raw = JSON.parse(await readFile(p, "utf8")) as unknown;
    return schema ? schema.parse(raw) : (raw as T);
  }
  return fallback;
}

export async function loadStore(): Promise<Store> {
  const run = await loadJson<PipelineRun | null>("data/artifacts/pipeline-run.json", null, PipelineRunSchema.nullable());
  const properties = await loadJson("data/artifacts/properties.json", [], z.array(PropertySchema));
  const permits = await loadJson("data/artifacts/permits.json", [], z.array(PermitSchema));
  const contractors = await loadJson("data/artifacts/contractors.json", [], z.array(ContractorSchema));
  const businesses = await loadJson("data/artifacts/businesses.json", [], z.array(BusinessSchema));
  return {
    run,
    properties,
    permits,
    contractors,
    businesses,
    source: run || properties.length ? "artifacts" : "missing",
  };
}

export type QueryArgs = {
  lat: number;
  lng: number;
  radiusMiles: number;
  minRoofAgeYears?: number;
  openRoofingOnly?: boolean;
  openPermitsOnly?: boolean;
  minOpenDays?: number;
  minOwnershipYears?: number;
  regionalOwnersOnly?: boolean;
};

export function queryProperties(store: Store, q: QueryArgs) {
  const permitsByProp = new Map<string, Permit[]>();
  for (const p of store.permits) {
    const arr = permitsByProp.get(p.propertyId) ?? [];
    arr.push(p);
    permitsByProp.set(p.propertyId, arr);
  }
  const contractors = new Map(store.contractors.map((c) => [c.contractorId, c]));

  return store.properties
    .map((p) => {
      const miles = haversineMiles(q.lat, q.lng, p.lat, p.lng);
      const permits = permitsByProp.get(p.propertyId) ?? [];
      return { property: p, miles, permits };
    })
    .filter((row) => row.miles <= q.radiusMiles)
    .filter((row) => {
      if (q.minRoofAgeYears == null) return true;
      const roof = row.property.roofAgeYears;
      const proxy = row.property.constructionAgeYears;
      return (
        (roof != null && roof >= q.minRoofAgeYears) ||
        (proxy != null && proxy >= q.minRoofAgeYears)
      );
    })
    .filter((row) => {
      if (!q.openRoofingOnly && !q.openPermitsOnly) return true;
      return row.permits.some((x) => {
        if (x.status !== "open") return false;
        if (q.openRoofingOnly && !x.isRoofing) return false;
        return q.minOpenDays == null || (x.openDurationDays ?? 0) >= q.minOpenDays;
      });
    })
    .filter((row) =>
      q.minOwnershipYears == null
        ? true
        : row.property.ownershipYears != null &&
          row.property.ownershipYears >= q.minOwnershipYears,
    )
    .filter((row) => (q.regionalOwnersOnly ? row.property.ownerIsRegional === true : true))
    .sort((a, b) => a.miles - b.miles)
    .map((row) => ({
      ...row,
      contractors: row.permits
        .map((p) => (p.contractorId ? contractors.get(p.contractorId) : undefined))
        .filter(Boolean),
    }));
}
