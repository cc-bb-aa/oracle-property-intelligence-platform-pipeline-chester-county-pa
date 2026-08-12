import { ringCentroid, bboxAround } from "../lib/geo.ts";
import { countMapLayer, queryMapLayer, type GisFeature } from "../lib/gis.ts";

const DEFAULT_MAPSERVER =
  process.env.PASDA_MAPSERVER ??
  "https://mapservices.pasda.psu.edu/server/rest/services/pasda/ChesterCounty/MapServer";

export type PasdaFeature = GisFeature;

export async function queryLayer(opts: {
  layer: number;
  where?: string;
  geometry?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  maxRecords: number;
  outFields?: string;
}): Promise<PasdaFeature[]> {
  return queryMapLayer({
    mapServer: DEFAULT_MAPSERVER,
    layer: opts.layer,
    where: opts.where,
    geometry: opts.geometry,
    maxRecords: opts.maxRecords,
    outFields: opts.outFields,
  });
}

export async function countLayer(opts: {
  layer: number;
  where?: string;
  geometry?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
}): Promise<number | null> {
  return countMapLayer({
    mapServer: DEFAULT_MAPSERVER,
    layer: opts.layer,
    where: opts.where,
    geometry: opts.geometry,
  });
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
