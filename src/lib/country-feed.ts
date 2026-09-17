import { countryInfo } from "./countries";
import { PROXIMITY_RELEVANT } from "./display";
import type { DisasterEvent } from "./types";

/**
 * The events a visitor in one country needs.
 *
 *   - Everything located in that country.
 *   - Everything from the global feeds, wherever it is. There are about a
 *     thousand in a month, and they draw the globe and catch a quake or
 *     cyclone across a border or offshore.
 *   - Incident reports from a neighbour's national feed when they fall near
 *     this country, in the last week, and are the kind of hazard that matters
 *     by proximity. Nepal's record holds thousands of reports a month, mostly
 *     snakebites and house fires; an Indian visitor 20 km from the border
 *     needs the landslide, not the rest.
 *
 * The visitor's position is never sent, so this cannot filter by distance.
 * The browser does that against what comes back.
 */
const NEIGHBOUR_MARGIN_DEG = 1.5;
const NEIGHBOUR_WINDOW_MS = 7 * 86_400_000;
/**
 * A box this wide is not "nearby" of anything. The United States' box spans
 * the antimeridian through the Aleutians, and Russia's and France's circle
 * the planet, which once pulled Nepal's entire record into the US view.
 */
const MAX_NEIGHBOUR_BOX_DEG = 60;

export function eventsForCountry(events: DisasterEvent[], code: string): DisasterEvent[] {
  const info = countryInfo(code);
  if (!info) return events.filter((event) => event.source !== "bipad");
  const [minLon, minLat, maxLon, maxLat] = info.bbox;
  const boxUsable =
    maxLon - minLon <= MAX_NEIGHBOUR_BOX_DEG && maxLat - minLat <= MAX_NEIGHBOUR_BOX_DEG;
  const since = Date.now() - NEIGHBOUR_WINDOW_MS;

  return events.filter((event) => {
    if (event.country === code) return true;
    if (event.source !== "bipad") return true;
    return (
      boxUsable &&
      PROXIMITY_RELEVANT.has(event.kind) &&
      Date.parse(event.occurredAt) >= since &&
      event.lat >= minLat - NEIGHBOUR_MARGIN_DEG &&
      event.lat <= maxLat + NEIGHBOUR_MARGIN_DEG &&
      event.lon >= minLon - NEIGHBOUR_MARGIN_DEG &&
      event.lon <= maxLon + NEIGHBOUR_MARGIN_DEG
    );
  });
}
