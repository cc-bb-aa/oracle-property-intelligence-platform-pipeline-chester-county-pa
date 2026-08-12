export type GisFeature = {
  attributes: Record<string, unknown>;
  geometry?: { rings?: number[][][]; x?: number; y?: number };
};

export type GisBbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

/** Paginated ArcGIS MapServer query (PASDA, Chesco EnerGov, Act 247). */
export async function queryMapLayer(opts: {
  mapServer: string;
  layer: number;
  where?: string;
  geometry?: GisBbox;
  maxRecords: number;
  outFields?: string;
  returnGeometry?: boolean;
  pageSize?: number;
}): Promise<GisFeature[]> {
  const pageSize = opts.pageSize ?? 200;
  const out: GisFeature[] = [];
  let offset = 0;
  while (out.length < opts.maxRecords) {
    const params = new URLSearchParams({
      where: opts.where ?? "1=1",
      outFields: opts.outFields ?? "*",
      returnGeometry: String(opts.returnGeometry ?? true),
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
    const url = `${opts.mapServer.replace(/\/$/, "")}/${opts.layer}/query?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GIS ${opts.mapServer} layer ${opts.layer} HTTP ${res.status}`);
    const body = (await res.json()) as { features?: GisFeature[]; error?: unknown };
    if (body.error) throw new Error(`GIS error ${JSON.stringify(body.error)}`);
    const feats = body.features ?? [];
    if (!feats.length) break;
    out.push(...feats);
    if (feats.length < pageSize) break;
    offset += feats.length;
  }
  return out;
}

export function esriIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}

export function featurePoint(
  f: GisFeature,
  ringCentroid: (ring: number[][] | undefined) => { lat: number; lng: number } | null,
): { lat: number; lng: number } | null {
  if (typeof f.geometry?.x === "number" && typeof f.geometry?.y === "number") {
    return { lng: f.geometry.x, lat: f.geometry.y };
  }
  return ringCentroid(f.geometry?.rings?.[0]);
}
