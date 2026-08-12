import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Permit, Property } from "../../../schema/src/index.ts";
import { slug } from "./transform.ts";

/**
 * county-permit-adapter (Chester PA)
 * County-level permits live on InfoVision Evolve (login). Municipal Accela/Tyler
 * portals are fragmented. This adapter:
 *  1. Loads optional harvested JSON from data/seeds/permits-chester-pa.json
 *  2. Synthesizes documented long-open roofing permits on real parcel UPIs
 *     only when seed harvest is empty, so radius/lead queries have real coordinates.
 * Synthesis is labeled in provenance.notes so it is never claimed as a county bulk file.
 */
export async function loadPermitHarvest(
  seedPath: string,
  properties: Property[],
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

  const now = new Date();
  const candidates = properties.filter((p) => p.propertyClass === "R").slice(0, 40);
  const permits: Permit[] = candidates.map((p, i) => {
    const opened = new Date(now);
    // Mix: long-open (no close) vs completed roofing years ago (roof-age proxy).
    const ageYears = 4 + (i % 22);
    opened.setFullYear(opened.getFullYear() - ageYears);
    const isLongOpen = i % 3 === 0;
    const closed = isLongOpen
      ? null
      : new Date(opened.getTime() + 120 * 86400000).toISOString();
    const contractor = ["Keystone Roofing LLC", "Brandywine Exteriors", "Valley Forge Roof Co"][
      i % 3
    ];
    return {
      permitId: `seed-roof-${p.upi}-${i}`,
      propertyId: p.propertyId,
      permitType: "Roofing / reroof",
      isRoofing: true,
      status: closed ? "closed" : "open",
      openedAt: opened.toISOString(),
      closedAt: closed,
      openDurationDays: closed
        ? 90
        : Math.round((now.getTime() - opened.getTime()) / 86400000),
      contractorName: contractor,
      contractorId: slug(contractor),
      description: "Roofing permit seed for demo (adapter fallback; not a county bulk extract).",
      provenance: {
        sourceId: "permit-adapter-fallback-seed",
        collectedAt: now.toISOString(),
        county: "Chester",
        notes:
          "Chester County Evolve permit portal requires login. Fallback seeds attach to real PASDA parcels so CRM radius queries work. Replace via data/seeds/permits-chester-pa.json after harvest.",
      },
    };
  });

  return {
    permits,
    source: "permit-adapter-fallback-seed",
    limitations:
      "County permit portal (Evolve) is account-gated. Fallback seeds use real Chester parcel UPIs and are labeled in provenance.",
  };
}

export function enrichContractorsBbb(
  contractors: { contractorId: string; name: string }[],
): { contractorId: string; name: string; bbbScore: number | null; bbbRating: string | null }[] {
  // BBB has no public bulk API. Deterministic placeholder ratings are tagged null unless seed provided.
  return contractors.map((c) => ({
    ...c,
    bbbScore: null,
    bbbRating: null,
  }));
}
