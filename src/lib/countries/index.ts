import countryData from "@/data/countries.json";
import timezones from "@/data/timezones.json";

/**
 * Country identity, shared by server and browser.
 *
 * A country is its ISO 3166-1 alpha-2 code everywhere in the app. Names come
 * from the browser's own Intl data where it has them, so they read the way the
 * reader's platform spells them, with Natural Earth as the fallback.
 *
 * Nothing here needs the network, which is what lets the packaged Android app
 * work out a country with no server behind it.
 */
export interface CountryInfo {
  code: string;
  name: string;
  /** [minLon, minLat, maxLon, maxLat], including overseas territories. */
  bbox: [number, number, number, number];
  /** A point inside the country, for centring a map or a globe. */
  center: [number, number];
}

type RawCountry = { name: string; bbox: number[]; center: number[] };
const RAW = countryData as Record<string, RawCountry>;

const displayNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) && value in RAW;
}

export function countryName(code: string): string {
  try {
    const name = displayNames?.of(code);
    if (name && name !== code) return name;
  } catch {
    /* An unknown code throws in some engines; fall through. */
  }
  return RAW[code]?.name ?? code;
}

export function countryInfo(code: string): CountryInfo | null {
  const raw = RAW[code];
  if (!raw) return null;
  return {
    code,
    name: countryName(code),
    bbox: raw.bbox as CountryInfo["bbox"],
    center: raw.center as CountryInfo["center"],
  };
}

/** Every country the app knows the shape of, sorted by display name. */
export function allCountries(): Array<{ code: string; name: string }> {
  return Object.keys(RAW)
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Best guess from the device's time zone. No permission, no network.
 *
 * Only a guess: someone in Kathmandu with a laptop still set to London time
 * gets the UK, which is why the country is always shown and always changeable,
 * and why a GPS fix overrides it.
 */
export function countryFromTimeZone(zone: string | undefined | null): string | null {
  if (!zone) return null;
  const code = (timezones as Record<string, string>)[zone];
  return isCountryCode(code) ? code : null;
}

export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** Flat rings as built by scripts/build-country-data.mjs. */
export type Borders = Record<string, { b: number[]; r: number[][] }>;

/** Even-odd ray cast over every ring, which handles holes and multipolygons. */
function contains(rings: number[][], lon: number, lat: number): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i];
      const yi = ring[i + 1];
      const xj = ring[j];
      const yj = ring[j + 1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** Which country a point is in, or null at sea and in disputed areas. */
export function locateIn(borders: Borders, lat: number, lon: number): string | null {
  for (const code in borders) {
    const { b, r } = borders[code];
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    if (contains(r, lon, lat)) return code;
  }
  return null;
}

/**
 * A map view that fits the country's mainland rather than every territory:
 * France's bounding box spans from the Caribbean to the Indian Ocean.
 */
export function mapViewFor(code: string): { center: [number, number]; zoom: number } {
  const info = countryInfo(code);
  if (!info) return { center: [0, 20], zoom: 1.5 };
  const [minLon, minLat, maxLon, maxLat] = info.bbox;
  const span = Math.max(maxLon - minLon, (maxLat - minLat) * 1.6);
  const zoom = span > 60 ? 4 : Math.max(2.5, Math.min(8, Math.log2(360 / span) + 0.6));
  return { center: info.center, zoom };
}
