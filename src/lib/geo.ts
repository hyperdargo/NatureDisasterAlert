/** Nepal's bounding box, used to tag events and to scope upstream queries. */
export const NEPAL_BBOX = {
  minLat: 26.347,
  maxLat: 30.447,
  minLon: 80.058,
  maxLon: 88.201,
} as const;

/** Roughly Kathmandu. Used only as the map's opening view, never as a user location. */
export const NEPAL_CENTER = { lat: 28.3949, lon: 84.124 } as const;

export function isInNepal(lat: number, lon: number): boolean {
  return (
    lat >= NEPAL_BBOX.minLat &&
    lat <= NEPAL_BBOX.maxLat &&
    lon >= NEPAL_BBOX.minLon &&
    lon <= NEPAL_BBOX.maxLon
  );
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}
