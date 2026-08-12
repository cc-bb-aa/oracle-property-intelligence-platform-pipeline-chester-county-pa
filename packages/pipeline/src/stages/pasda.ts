import { ringCentroid, bboxAround } from "../lib/geo.ts";

const DEFAULT_MAPSERVER =
  process.env.PASDA_MAPSERVER ??
  "https://mapservices.pasda.psu.edu/server/rest/services/pasda/ChesterCounty/MapServer";

export type PasdaFeature = {
  attributes: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
};

export async function queryLayer(opts: {
  layer: number;
  where?: string;
  geometry?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  maxRecords: number;
  outFields?: string;
}): Promise<PasdaFeature[]> {
  const pageSize = 200;
  const out: PasdaFeature[] = [];
  let offset = 0;
  while (out.length < opts.maxRecords) {
    const params = new URLSearchParams({
      where: opts.where ?? "1=1",
      outFields: opts.outFields ?? "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
      resultOffset: String(offset),
      resultRecordCount: String(Math.min(pageSize, opts.maxRecords - out.length)),
    });
    if (opts.geometry) {
      params.set("geometryType", "esriGeometryEnvelope");
      params.set("inSR", "4326");
      params.set("spatialRel", "esriSpatialRelIntersects");
      params.set(
        "geometry",
        JSON.stringify({
          xmin: opts.geometry.minLng,
          ymin: opts.geometry.minLat,
          xmax: opts.geometry.maxLng,
          ymax: opts.geometry.maxLat,
          spatialReference: { wkid: 4326 },
        }),
      );
    }
    const url = `${DEFAULT_MAPSERVER}/${opts.layer}/query?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PASDA ${opts.layer} HTTP ${res.status}`);
    const body = (await res.json()) as { features?: PasdaFeature[]; error?: unknown };
    if (body.error) throw new Error(`PASDA error ${JSON.stringify(body.error)}`);
    const feats = body.features ?? [];
    if (!feats.length) break;
    out.push(...feats);
    if (feats.length < pageSize) break;
    offset += feats.length;
  }
  return out;
}

export function westChesterBbox(miles = 5) {
  const lat = Number(process.env.WEST_CHESTER_LAT ?? 39.9607);
  const lng = Number(process.env.WEST_CHESTER_LNG ?? -75.6055);
  return bboxAround(lat, lng, miles);
}

export function parcelToCentroid(f: PasdaFeature): { lat: number; lng: number } | null {
  const ring = f.geometry?.rings?.[0];
  return ringCentroid(ring);
}
