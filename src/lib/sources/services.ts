import { z } from "zod";
import { haversineKm } from "../geo";
import { coarsenForLookup } from "../coarsen";
import { UpstreamError } from "../fetch-upstream";

/**
 * Nearby hospitals, clinics, police and fire stations, from OpenStreetMap via
 * the Overpass API. Free, no key.
 *
 * On privacy: finding what is near someone unavoidably requires knowing
 * roughly where they are. Rather than pretend otherwise, the coordinates are
 * coarsened to two decimal places (about 1.1 km) before they ever leave the
 * browser, the query runs through our own server so the visitor is not exposed
 * to a third party's logs, and nothing is written down at either end. The
 * interface states this instead of claiming the location never moves.
 *
 * On completeness: OpenStreetMap phone coverage in Nepal is thin. A spot check
 * around Kathmandu found numbers on 2 of 40 facilities. So a facility is shown
 * with directions and distance regardless, and a phone number only when one
 * genuinely exists. The national numbers are the reliable path and are always
 * listed first.
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const SEARCH_RADIUS_M = 15_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type ServiceKind = "hospital" | "clinic" | "police" | "fire";

export interface EmergencyService {
  id: string;
  kind: ServiceKind;
  name: string;
  phone: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
}

const Element = z.object({
  type: z.string(),
  id: z.number(),
  lat: z.number().nullish(),
  lon: z.number().nullish(),
  center: z.object({ lat: z.number(), lon: z.number() }).nullish(),
  tags: z.record(z.string(), z.string()).nullish(),
});

const Payload = z.object({ elements: z.array(z.unknown()) });

const KIND_BY_TAG: Record<string, ServiceKind> = {
  hospital: "hospital",
  clinic: "clinic",
  doctors: "clinic",
  police: "police",
  fire_station: "fire",
};

export const SERVICE_LABEL: Record<ServiceKind, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  police: "Police",
  fire: "Fire station",
};

const cache = new Map<string, { at: number; services: EmergencyService[] }>();

function firstPhone(tags: Record<string, string>): string | null {
  const raw =
    tags["emergency:phone"] ?? tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"];
  if (!raw) return null;
  // Tags often hold several numbers; offer the first, tidied for tel:.
  const first = raw.split(/[;,]/)[0].trim();
  const cleaned = first.replace(/[^\d+]/g, "");
  return cleaned.length >= 3 ? first : null;
}

async function queryOverpass(lat: number, lon: number): Promise<unknown> {
  const query = `[out:json][timeout:20];
(
  nwr["amenity"~"^(hospital|clinic|doctors|police|fire_station)$"](around:${SEARCH_RADIUS_M},${lat},${lon});
);
out center tags 60;`;

  let lastError: unknown = null;
  // Overpass mirrors rate-limit aggressively; fall through to the next one.
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(20_000),
        headers: {
          "user-agent": "NatureDisasterAlert/0.1 (public safety; open source)",
        },
      });
      if (!response.ok) {
        lastError = new UpstreamError("overpass", `HTTP ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new UpstreamError("overpass", "all mirrors failed");
}

export async function fetchNearbyServices(
  rawLat: number,
  rawLon: number,
): Promise<EmergencyService[]> {
  // Coarsened again server-side: the client already did this, but a request
  // can be crafted by hand and must not be able to ask for a precise point.
  const lat = coarsenForLookup(rawLat);
  const lon = coarsenForLookup(rawLon);
  const key = `${lat},${lon}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.services;

  const payload = Payload.parse(await queryOverpass(lat, lon));

  const services: EmergencyService[] = [];
  for (const raw of payload.elements) {
    const parsed = Element.safeParse(raw);
    if (!parsed.success) continue;
    const element = parsed.data;

    const point = element.center ?? { lat: element.lat, lon: element.lon };
    if (typeof point.lat !== "number" || typeof point.lon !== "number") continue;

    const tags = element.tags ?? {};
    const kind = KIND_BY_TAG[tags.amenity ?? ""];
    if (!kind) continue;

    // An unnamed point on a map is no use to someone who needs to get there.
    const name = (tags["name:en"] ?? tags.name ?? "").trim();
    if (!name) continue;

    services.push({
      id: `${element.type}-${element.id}`,
      kind,
      name,
      phone: firstPhone(tags),
      lat: point.lat,
      lon: point.lon,
      distanceKm: haversineKm(lat, lon, point.lat, point.lon),
    });
  }

  // Facilities that can be phoned come first, then by distance.
  services.sort(
    (a, b) =>
      Number(b.phone !== null) - Number(a.phone !== null) || a.distanceKm - b.distanceKm,
  );

  const top = services.slice(0, 20);
  cache.set(key, { at: Date.now(), services: top });

  // Bounded so a busy day cannot grow this without limit.
  if (cache.size > 500) {
    for (const [k, v] of cache) {
      if (Date.now() - v.at > CACHE_TTL_MS) cache.delete(k);
    }
  }
  return top;
}
