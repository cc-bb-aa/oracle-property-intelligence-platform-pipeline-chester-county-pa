import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Permit, Property } from "../../../schema/src/index.ts";
import { haversineMiles } from "../../../schema/src/index.ts";
import { slug } from "./transform.ts";
import { esriIso, featurePoint, queryMapLayer, type GisBbox, type GisFeature } from "../lib/gis.ts";
import { ringCentroid } from "../lib/geo.ts";

const ACT247 =
  process.env.ACT247_MAPSERVER ??
  "https://gisprodops.chesco.org/server/rest/services/Planning_Services/Plan_Act247_AGOL_D/MapServer";
const ENERGOV_DATA =
  process.env.ENERGOV_DATA_MAPSERVER ??
  "https://gisprodops.chesco.org/server/rest/services/EnerGov_Services/EnerGov_Data_D_CL2/MapServer";
const ENERGOV_HIST =
  process.env.ENERGOV_HIST_MAPSERVER ??
  "https://gisprodops.chesco.org/server/rest/services/EnerGov_Services/EnerGov_History_D_CL2/MapServer";

const ROOF_RE = /\b(roof|reroof|re-roof|shingle|gutter|soffit|fascia)\b/i;

export function looksRoofing(...parts: Array<string | null | undefined>): boolean {
  return ROOF_RE.test(parts.filter(Boolean).join(" "));
}

export function mapPermitStatus(raw: string | null | undefined): "open" | "closed" | "unknown" {
  const t = (raw ?? "").toLowerCase();
  if (!t) return "unknown";
  if (/(received|pending|in review|under review|open|active|submitted|incomplete)/.test(t)) {
    return "open";
  }
  if (/(expir|closed|complet|void|denied|cancelled|canceled|withdrawn|approved|issued|final|signed)/.test(t)) {
    return "closed";
  }
  return "unknown";
}

export function normalizeUpi(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function attr(a: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = a[k];
    if (v == null) continue;
    const s = String(v).split(/\r?\n/)[0].trim();
    if (s && s !== "null") return s;
  }
  return null;
}

function durationDays(openedAt: string | null, closedAt: string | null, now = new Date()): number | null {
  if (!openedAt) return null;
  const start = Date.parse(openedAt);
  if (Number.isNaN(start)) return null;
  const end = closedAt ? Date.parse(closedAt) : now.getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 86400000));
}

function nearestProperty(
  lat: number,
  lng: number,
  properties: Property[],
  maxMiles = 0.4,
): Property | null {
  let best: Property | null = null;
  let bestD = maxMiles;
  for (const p of properties) {
    const d = haversineMiles(lat, lng, p.lat, p.lng);
    if (d <= bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function propertyByUpi(properties: Property[]): Map<string, Property> {
  const map = new Map<string, Property>();
  for (const p of properties) map.set(normalizeUpi(p.upi), p);
  return map;
}

export function makePermit(input: {
  permitId: string;
  property: Property;
  permitType: string;
  isRoofing: boolean;
  status: "open" | "closed" | "unknown";
  openedAt: string | null;
  closedAt: string | null;
  contractorName: string | null;
  description?: string;
  sourceId: string;
  sourceUrl: string;
  notes: string;
}): Permit {
  const now = new Date().toISOString();
  const contractorName = input.contractorName;
  return {
    permitId: input.permitId,
    propertyId: input.property.propertyId,
    permitType: input.permitType,
    isRoofing: input.isRoofing,
    status: input.status,
    openedAt: input.openedAt,
    closedAt: input.closedAt,
    openDurationDays: durationDays(input.openedAt, input.status === "closed" ? input.closedAt : null),
    contractorName,
    contractorId: contractorName ? slug(contractorName) : null,
    description: input.description,
    provenance: {
      sourceId: input.sourceId,
      sourceUrl: input.sourceUrl,
      collectedAt: now,
      county: "Chester",
      notes: input.notes,
    },
  };
}

export function wellOrSewageToPermit(
  f: GisFeature,
  properties: Map<string, Property>,
  kind: "well" | "sewage",
  sourceUrl: string,
): Permit | null {
  const a = f.attributes;
  const upi = normalizeUpi(a.UPI ?? a.Parcel);
  const property = properties.get(upi);
  if (!property) return null;
  const permitId = attr(a, "Permit_ID") ?? `${kind}-${upi}-${a.OBJECTID}`;
  const rawStatus = attr(a, "Permit_Status", "Status");
  const openedAt = esriIso(a.AppDate ?? a.App_Date ?? a.Issued_Date);
  const closedAt = esriIso(a.Approved_Date ?? a.Decommissioned);
  const contractor = attr(a, "Applicant1", "Applicant2", "SEO_Issued", "Issued_EHS");
  const work = attr(a, "Work_Class", "Constr_Type", "System_Class") ?? kind;
  const site = attr(a, "Site_Address");
  return makePermit({
    permitId: `chesco-${kind}-${permitId}`,
    property,
    permitType: `County health ${kind} (${work})`,
    isRoofing: looksRoofing(work, attr(a, "Cmnts")),
    status: mapPermitStatus(rawStatus),
    openedAt,
    closedAt: mapPermitStatus(rawStatus) === "closed" ? closedAt ?? openedAt : null,
    contractorName: contractor,
    description: [site, attr(a, "Municipality"), attr(a, "Cmnts")].filter(Boolean).join(" · "),
    sourceId: `chesco-energov-${kind}`,
    sourceUrl,
    notes:
      "Chester County Health Department EnerGov GIS. Real well/sewage permits with UPI. Not municipal building/roofing UCC.",
  });
}

export function act247ToPermit(
  f: GisFeature,
  properties: Property[],
  kind: "land-development" | "subdivision",
  sourceUrl: string,
): Permit | null {
  const a = f.attributes;
  const pt = featurePoint(f, ringCentroid);
  if (!pt) return null;
  const property = nearestProperty(pt.lat, pt.lng, properties);
  if (!property) return null;
  const plan = attr(a, "PLAN_NUM", "PROJECT_NUM", "LAND_DEV_ID") ?? String(a.OBJECTID);
  const title = attr(a, "PLAN_TITLE", "PROJECT_NAME") ?? kind;
  const openedAt = esriIso(a.SUBMIT_DATE ?? a.REVIEW_DATE);
  const signed = esriIso(a.CCPC_SIGN_DATE ?? a.MCP_SIGN_DATE);
  const status = signed ? "closed" : "open";
  const desc = attr(a, "DESCRIPTION", "PRIMARY_USE", "PRIMARY_CODE") ?? title;
  return makePermit({
    permitId: `chesco-act247-${plan}`,
    property,
    permitType: `Act 247 ${kind}${attr(a, "PRIMARY_CODE") ? ` / ${attr(a, "PRIMARY_CODE")}` : ""}`,
    isRoofing: looksRoofing(title, desc),
    status,
    openedAt,
    closedAt: signed,
    contractorName: attr(a, "PROJECT_NAME", "PLAN_TITLE"),
    description: desc ?? undefined,
    sourceId: "chesco-act247-gis",
    sourceUrl,
    notes:
      "Chester County Planning Act 247 GIS (public). Land-development / subdivision applications, not municipal roofing UCC. Open = submitted without CCPC/MCP sign-off.",
  });
}

export function energovHistToPermit(
  f: GisFeature,
  byUpi: Map<string, Property>,
  properties: Property[],
  sourceUrl: string,
): Permit | null {
  const a = f.attributes;
  const moduleName = attr(a, "MODULENAME") ?? "EnerGov";
  const caseNumber = attr(a, "CASENUMBER") ?? String(a.OBJECTID);
  const spatialType = attr(a, "SPATIALTYPE");
  const spatialId = normalizeUpi(a.SPATIALID);
  const pt = featurePoint(f, ringCentroid);
  let property = spatialType === "Parcel" && spatialId ? byUpi.get(spatialId) : undefined;
  if (!property && pt) property = nearestProperty(pt.lat, pt.lng, properties) ?? undefined;
  if (!property) return null;
  const openedAt = esriIso(a.APPLICATIONDATE);
  const name = attr(a, "PROJECTNAME");
  return makePermit({
    permitId: `chesco-energov-${caseNumber}`,
    property,
    permitType: `County EnerGov ${moduleName}`,
    isRoofing: looksRoofing(caseNumber, name),
    status: "unknown",
    openedAt,
    closedAt: null,
    contractorName: name,
    description: [caseNumber, name, spatialType, spatialId].filter(Boolean).join(" · "),
    sourceId: "chesco-energov-history",
    sourceUrl,
    notes:
      "Chester County EnerGov history GIS (Permit/Plan/Inspection). Public case points/polygons. Status is not published on this layer.",
  });
}

/**
 * county-permit-adapter (Chester PA)
 * Public bulk harvest, in order:
 *  1. Optional harvested JSON at data/seeds/permits-chester-pa.json
 *  2. Chester County Health EnerGov well + sewage (UPI join)
 *  3. Act 247 land-development + subdivision GIS (spatial join)
 *  4. EnerGov history PermitManagement (UPI / nearest)
 *
 * Municipal building/roofing UCC (InfoVision Evolve, West Chester SmartGov)
 * is login or form-walled and is not synthesized.
 */
export async function loadPermitHarvest(
  seedPath: string,
  properties: Property[],
  bbox?: GisBbox,
): Promise<{ permits: Permit[]; source: string; limitations: string }> {
  if (existsSync(seedPath)) {
    const raw = JSON.parse(await readFile(seedPath, "utf8")) as Permit[];
    if (raw.length) {
      return {
        permits: raw,
        source: seedPath,
        limitations: "Loaded harvested permit seed JSON.",
      };
    }
  }

  const max = Number(process.env.MAX_PERMITS ?? 8000);
  const byUpi = propertyByUpi(properties);
  const harvested: Permit[] = [];
  const seen = new Set<string>();
  const push = (p: Permit | null) => {
    if (!p || seen.has(p.permitId) || harvested.length >= max) return;
    seen.add(p.permitId);
    harvested.push(p);
  };

  const wellUrl = `${ENERGOV_DATA}/11`;
  const sewageUrl = `${ENERGOV_DATA}/12`;
  const act247Url = `${ACT247}/2`;
  const histUrl = `${ENERGOV_HIST}/2`;

  const [wells, sewage, landDev, subdiv, histPoly, histPts] = await Promise.all([
    queryMapLayer({
      mapServer: ENERGOV_DATA,
      layer: 11,
      geometry: bbox,
      maxRecords: max,
      outFields: "OBJECTID,Status,Permit_Status,Work_Class,Permit_ID,Parcel,UPI,AppDate,Issued_Date,Approved_Date,Municipality,Site_Address,Applicant1,Applicant2,Issued_EHS,Constr_Type,Cmnts",
    }),
    queryMapLayer({
      mapServer: ENERGOV_DATA,
      layer: 12,
      geometry: bbox,
      maxRecords: max,
      outFields: "OBJECTID,Status,Permit_Status,Work_Class,Permit_ID,Parcel,UPI,App_Date,Issued_Date,Approved_Date,Applicant1,Applicant2,Municipality,Site_Address,System_Class,SEO_Issued,Cmnts",
    }),
    queryMapLayer({
      mapServer: ACT247,
      layer: 2,
      geometry: bbox,
      maxRecords: max,
    }),
    queryMapLayer({
      mapServer: ACT247,
      layer: 3,
      geometry: bbox,
      maxRecords: max,
    }),
    queryMapLayer({
      mapServer: ENERGOV_HIST,
      layer: 2,
      where: "MODULENAME='PermitManagement'",
      geometry: bbox,
      maxRecords: max,
    }),
    queryMapLayer({
      mapServer: ENERGOV_HIST,
      layer: 0,
      where: "MODULENAME='PermitManagement'",
      geometry: bbox,
      maxRecords: max,
    }),
  ]);

  for (const f of wells) push(wellOrSewageToPermit(f, byUpi, "well", wellUrl));
  for (const f of sewage) push(wellOrSewageToPermit(f, byUpi, "sewage", sewageUrl));
  for (const f of landDev) push(act247ToPermit(f, properties, "land-development", act247Url));
  for (const f of subdiv) push(act247ToPermit(f, properties, "subdivision", `${ACT247}/3`));
  for (const f of histPoly) push(energovHistToPermit(f, byUpi, properties, histUrl));
  for (const f of histPts) push(energovHistToPermit(f, byUpi, properties, `${ENERGOV_HIST}/0`));

  return {
    permits: harvested,
    source: "chesco-energov+act247-gis",
    limitations:
      `Harvested ${harvested.length} real Chester County GIS permits (health well/sewage, Act 247 land-dev/subdivision, EnerGov PermitManagement). ` +
      "Municipal building/roofing UCC (Evolve / West Chester SmartGov) is account- or form-walled and was not synthesized. " +
      "isRoofing is keyword-tagged only; most records are county health or planning cases.",
  };
}
