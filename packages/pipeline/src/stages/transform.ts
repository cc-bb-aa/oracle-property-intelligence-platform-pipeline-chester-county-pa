import {
  type Business,
  type Contractor,
  type Permit,
  type Property,
  ownerIsRegional,
  roofAgeYears,
  yearsSince,
} from "../../../schema/src/index.ts";
import type { PasdaFeature } from "./pasda.ts";
import { parcelToCentroid } from "./pasda.ts";

const now = () => new Date().toISOString();

export function transformParcel(f: PasdaFeature): Property | null {
  const a = f.attributes;
  const c = parcelToCentroid(f);
  if (!c) return null;
  const upi = String(a.UPI ?? "").trim();
  if (!upi) return null;
  const address = String(a.LOC_ADDRES ?? "").trim() || upi;
  const ownerName = [a.OWN1, a.OWN2]
    .map((x) => String(x ?? "").trim())
    .filter((x) => x && x !== " ")
    .join(" / ");
  const mailing = [a.ADDR1, a.ADDR2, a.ADDR3, a.ZIP1]
    .map((x) => String(x ?? "").trim())
    .filter((x) => x && x !== " ")
    .join(", ");
  const deed = String(a.DEED_REC_D ?? "").trim() || null;
  const mailingZip = String(a.ZIP1 ?? "").trim() || undefined;
  // ZIP1 is the owner mailing zip, not the site zip. Using it as siteZip
  // made every owner look local (mailing string always contains ZIP1).
  const siteZip = siteZipFromAddress(address);
  const { age, basis } = roofAgeYears({ yearBuilt: null, lastRoofingCompletedAt: null });
  return {
    propertyId: `chester:${upi}`,
    upi,
    address,
    city: cityFromPasda(a.ADDR2, mailing),
    zip: siteZip ?? mailingZip,
    ownerName: ownerName || undefined,
    ownerMailing: mailing || undefined,
    lat: c.lat,
    lng: c.lng,
    yearBuilt: null,
    roofAgeYears: age,
    roofAgeBasis: basis,
    lastSaleAmount: typeof a.LAST_SALE_ === "number" ? a.LAST_SALE_ : null,
    deedRecordedAt: deed,
    ownershipYears: yearsSince(deed),
    ownerIsRegional: ownerIsRegional(siteZip, mailing),
    luc: String(a.LUC ?? "").trim() || undefined,
    propertyClass: String(a.CLASS ?? "").trim() || undefined,
    provenance: {
      sourceId: "pasda-chester-parcels-202604",
      sourceUrl:
        "https://mapservices.pasda.psu.edu/server/rest/services/pasda/ChesterCounty/MapServer/11",
      collectedAt: now(),
      county: "Chester",
    },
  };
}

export function applyRoofingPermitAge(p: Property, permits: Permit[]): Property {
  const mine = permits.filter((x) => x.propertyId === p.propertyId);
  const roofingDone = mine
    .filter((x) => x.isRoofing)
    .map((x) => x.closedAt)
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1);
  const constructionDone = mine
    .filter((x) => x.status === "closed" && /act 247|construct|building|land-development/i.test(`${x.permitType} ${x.description ?? ""}`))
    .map((x) => x.closedAt)
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1);
  const { age, basis } = roofAgeYears({
    yearBuilt: p.yearBuilt,
    lastRoofingCompletedAt: roofingDone ?? constructionDone ?? null,
  });
  return {
    ...p,
    roofAgeYears: age,
    roofAgeBasis: roofingDone ? basis : constructionDone ? "last_construction_permit" : basis,
  };
}

export function contractorsFromPermits(permits: Permit[]): Contractor[] {
  const map = new Map<string, Contractor>();
  for (const p of permits) {
    if (!p.contractorName) continue;
    const id = p.contractorId ?? slug(p.contractorName);
    if (map.has(id)) continue;
    map.set(id, {
      contractorId: id,
      name: p.contractorName,
      bbbScore: null,
      bbbRating: null,
      provenance: p.provenance,
    });
  }
  return [...map.values()];
}

export function businessesFromOwners(properties: Property[]): Business[] {
  const out: Business[] = [];
  const seen = new Set<string>();
  for (const p of properties) {
    if (p.propertyClass !== "C" && p.propertyClass !== "I") continue;
    const name = p.ownerName;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      businessId: slug(name),
      name,
      address: p.address,
      zip: p.zip,
      source: "parcel-owner-commercial-class",
      provenance: {
        ...p.provenance,
        sourceId: "pasda-owner-as-business",
        notes: "Sunbiz is Florida-only. PA business layer uses commercial parcel owners.",
      },
    });
  }
  return out;
}

/** Site zip only when it is on the situs address. PASDA ZIP1 is mailing. */
export function siteZipFromAddress(address: string): string | undefined {
  const m = address.trim().match(/\b(\d{5})(?:-\d{4})?\s*$/);
  return m?.[1];
}

export function cityFromPasda(addr2: unknown, mailing: string): string | undefined {
  const line = String(addr2 ?? "").trim();
  const lineMatch = line.match(/^(.+?)[,\s]+([A-Z]{2})$/i);
  if (lineMatch) return lineMatch[1].replace(/,$/, "").trim();
  const mailMatch = mailing.match(/,\s*([^,]+?)\s+([A-Z]{2})\b/i);
  if (mailMatch) return mailMatch[1].trim();
  return undefined;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function reconcileProperties(rows: Property[]): Property[] {
  const map = new Map<string, Property>();
  for (const r of rows) {
    const existing = map.get(r.upi);
    if (!existing) {
      map.set(r.upi, r);
      continue;
    }
    map.set(r.upi, {
      ...existing,
      ...r,
      lat: r.lat || existing.lat,
      lng: r.lng || existing.lng,
      ownerName: r.ownerName || existing.ownerName,
    });
  }
  return [...map.values()];
}
