/** Centroid of first ring (lon/lat pairs). */
export function ringCentroid(ring: number[][] | undefined): { lat: number; lng: number } | null {
  if (!ring || ring.length < 3) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const pt of ring) {
    if (pt.length < 2) continue;
    x += pt[0];
    y += pt[1];
    n += 1;
  }
  if (!n) return null;
  return { lng: x / n, lat: y / n };
}

export function bboxAround(
  lat: number,
  lng: number,
  miles: number,
): { minLng: number; minLat: number; maxLng: number; maxLat: number } {
  const dLat = miles / 69;
  const dLng = miles / (69 * Math.cos((lat * Math.PI) / 180));
  return {
    minLng: lng - dLng,
    minLat: lat - dLat,
    maxLng: lng + dLng,
    maxLat: lat + dLat,
  };
}
