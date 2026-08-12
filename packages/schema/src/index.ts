import { z } from "zod";

export const COUNTY = {
  id: "chester-pa",
  name: "Chester",
  state: "PA",
  fallbacks: ["Montgomery", "Delaware", "Bucks"] as const,
};

export const RoofAgeThresholdDefault = 15;
export const OwnershipYearsDefault = 10;

export const ProvenanceSchema = z.object({
  sourceId: z.string(),
  sourceUrl: z.string().optional(),
  collectedAt: z.string(),
  county: z.string(),
  notes: z.string().optional(),
});

export const PropertySchema = z.object({
  propertyId: z.string(),
  upi: z.string(),
  address: z.string(),
  city: z.string().optional(),
  zip: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingZip: z.string().optional(),
  ownerName: z.string().optional(),
  ownerMailing: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  yearBuilt: z.number().nullable(),
  roofAgeYears: z.number().nullable(),
  roofAgeBasis: z.string(),
  constructionAgeYears: z.number().nullable().optional(),
  lastSaleAmount: z.number().nullable(),
  deedRecordedAt: z.string().nullable(),
  ownershipYears: z.number().nullable(),
  ownerIsRegional: z.boolean().nullable(),
  luc: z.string().optional(),
  propertyClass: z.string().optional(),
  provenance: ProvenanceSchema,
});

export const PermitSchema = z.object({
  permitId: z.string(),
  propertyId: z.string(),
  permitType: z.string(),
  isRoofing: z.boolean(),
  status: z.enum(["open", "closed", "unknown"]),
  openedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  openDurationDays: z.number().nullable(),
  contractorName: z.string().nullable(),
  contractorId: z.string().nullable(),
  description: z.string().optional(),
  provenance: ProvenanceSchema,
});

export const ContractorSchema = z.object({
  contractorId: z.string(),
  name: z.string(),
  bbbScore: z.number().nullable(),
  bbbRating: z.string().nullable(),
  provenance: ProvenanceSchema,
});

export const BusinessSchema = z.object({
  businessId: z.string(),
  name: z.string(),
  address: z.string().optional(),
  zip: z.string().optional(),
  source: z.string(),
  provenance: ProvenanceSchema,
});

export const PipelineRunSchema = z.object({
  runId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  primaryCounty: z.string(),
  fallbacksAttempted: z.array(z.string()),
  coverage: z.array(
    z.object({
      dataset: z.string(),
      county: z.string(),
      isFallback: z.boolean(),
      records: z.number(),
      sourceUrl: z.string().optional(),
      limitations: z.string().optional(),
    }),
  ),
  counts: z.record(z.number()),
  ipfs: z.array(z.object({ artifact: z.string(), cid: z.string() })),
  duckdbPath: z.string(),
  limitations: z.array(z.string()),
  skillStages: z.array(z.string()),
});

export type Property = z.infer<typeof PropertySchema>;
export type Permit = z.infer<typeof PermitSchema>;
export type Contractor = z.infer<typeof ContractorSchema>;
export type Business = z.infer<typeof BusinessSchema>;
export type PipelineRun = z.infer<typeof PipelineRunSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.7613;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function yearsSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / (365.25 * 24 * 3600 * 1000);
}

export function roofAgeYears(input: {
  yearBuilt: number | null;
  lastRoofingCompletedAt: string | null;
  nowYear?: number;
}): { age: number | null; basis: string } {
  const nowYear = input.nowYear ?? new Date().getUTCFullYear();
  if (input.yearBuilt && input.yearBuilt > 1800 && input.yearBuilt <= nowYear) {
    return { age: nowYear - input.yearBuilt, basis: "year_built" };
  }
  if (input.lastRoofingCompletedAt) {
    const y = yearsSince(input.lastRoofingCompletedAt);
    if (y != null) return { age: Math.floor(y), basis: "last_roofing_permit" };
  }
  return { age: null, basis: "unknown" };
}

export function mailingState(mailing: string): string | null {
  const m = mailing.toUpperCase();
  const withZip = m.match(/\b([A-Z]{2})[,\s]+\d{5}(?:-\d{4})?\b/);
  if (withZip) return withZip[1];
  const tail = m.match(/\b([A-Z]{2})\s*$/);
  if (tail) return tail[1];
  return null;
}

export function ownerIsRegional(
  siteZip: string | undefined,
  mailing: string | undefined,
  siteState = "PA",
): boolean | null {
  if (!mailing) return null;
  const m = mailing.toUpperCase();
  const state = mailingState(m);
  // Do not use String.includes("PA") — it matches PACES, PARK, etc.
  if (state && state !== siteState) return true;
  if (siteZip && m.includes(siteZip.trim()) && (!state || state === siteState)) return false;
  if (!state) return null;
  return false;
}
