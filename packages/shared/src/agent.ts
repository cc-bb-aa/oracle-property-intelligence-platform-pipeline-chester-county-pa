import type { QueryArgs } from "./store.ts";

export type AgentQuery = QueryArgs & {
  askedRoofingUcc: boolean;
};

/** Parse a demo / NL question into the deterministic query the hosted agent uses. */
export function parseAgentQuestion(
  question: string,
  lat = 39.9607,
  lng = -75.6055,
): AgentQuery {
  const q = question.toLowerCase();
  const asksOpenPermit = q.includes("open") && q.includes("permit");
  const askedRoofingUcc = asksOpenPermit && q.includes("roofing");
  const asksAgedRoof =
    !asksOpenPermit && (q.includes("15") || q.includes("older")) && q.includes("roof");
  let minOpenDays: number | undefined;
  if (asksOpenPermit) {
    if (q.includes("many years")) minOpenDays = 365 * 3;
    else if (q.includes("five years") || q.includes("5 years")) minOpenDays = 365 * 5;
    else minOpenDays = 365;
  }
  return {
    lat,
    lng,
    radiusMiles: 5,
    minRoofAgeYears: asksAgedRoof ? 15 : undefined,
    // Official "open roofing" prompt answers with public county permits.
    // Do not AND isRoofing — that harvest is empty and would return 0.
    openPermitsOnly: asksOpenPermit,
    openRoofingOnly: false,
    askedRoofingUcc,
    minOpenDays,
  };
}

export function agentCaveats(askedRoofingUcc: boolean, askedAgedRoof = false): string[] {
  const caveats = [
    "Municipal building/roofing UCC (Evolve / West Chester SmartGov) is not in the public harvest.",
    "Open-permit results are Chester County Act 247 / EnerGov / health GIS, not municipal roofing permits.",
  ];
  if (askedRoofingUcc) {
    caveats.push(
      "isRoofing is keyword-tagged only; this harvest has no roofing-tagged rows. Showing long-open county permits instead.",
    );
  }
  if (askedAgedRoof) {
    caveats.push(
      "PASDA has no year_built. roofAgeYears is a closed roofing-tagged permit only. Aged-roof matches may use constructionAgeYears (last land-dev/construction), which is not a roof age.",
    );
  }
  return caveats;
}
