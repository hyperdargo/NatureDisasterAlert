import { haversineKm } from "./geo";
import { PROXIMITY_RELEVANT, SEVERITY_STYLE } from "./display";
import type { DisasterEvent } from "./types";

export interface NearbyHazard extends DisasterEvent {
  distanceKm: number;
}

/**
 * Rank what is near the viewer: gravest first, then closest.
 *
 * Only hazards a person can act on by proximity are included. A snakebite
 * logged 12 km away is a real incident but not an approaching threat, and
 * padding this list with them would train people to ignore it.
 *
 * Runs in the browser against the list the server already sent; the position
 * is never transmitted.
 */
export function selectNearby(
  events: DisasterEvent[],
  viewer: { lat: number; lon: number },
  radiusKm: number,
): NearbyHazard[] {
  return events
    .filter((event) => PROXIMITY_RELEVANT.has(event.kind))
    .map((event) => ({
      ...event,
      distanceKm: haversineKm(viewer.lat, viewer.lon, event.lat, event.lon),
    }))
    .filter((event) => event.distanceKm <= radiusKm)
    .sort(
      (a, b) =>
        SEVERITY_STYLE[b.severity].rank - SEVERITY_STYLE[a.severity].rank ||
        a.distanceKm - b.distanceKm,
    );
}

export const RADII = [25, 50, 100] as const;

/**
 * How recent a hazard must be to count in the headline.
 *
 * The feed covers 30 days. Around Kathmandu that is dozens of reports in any
 * month, and a giant "83 hazards near you" built from a landslide four weeks
 * ago is alarm, not information. The headline counts the last week; older
 * reports are mentioned and stay on the map.
 */
export const RECENT_DAYS = 7;

export function splitByRecency(nearby: NearbyHazard[], now: number) {
  const cutoff = now - RECENT_DAYS * 86_400_000;
  const recent = nearby.filter((hazard) => Date.parse(hazard.occurredAt) >= cutoff);
  return { recent, olderCount: nearby.length - recent.length };
}
