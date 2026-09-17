import timezones from "@/data/timezones.json";
import { countryName } from "./index";

/**
 * What the app can honestly offer for each country.
 *
 * Every country gets the global feeds (USGS, GDACS, NASA EONET), OpenStreetMap
 * facilities, a news search and its emergency numbers. A few also have a
 * national feed that a person there would recognise as official, and the
 * interface says plainly which kind of coverage it is showing:
 *
 *   NP  BIPAD Portal. Incident reports with verified casualty counts. The only
 *       source anywhere in the app that counts deaths, so the only country
 *       that gets casualty totals, district tables and the road advisory.
 *   IN  NDMA SACHET. Official warnings issued by Indian agencies (IMD, CWC and
 *       state authorities). Warnings, not incidents: no casualty figures.
 *   US  National Weather Service. Official active alerts. Warnings, not
 *       incidents.
 *
 * Adding a country means adding an adapter in src/lib/sources that produces
 * OfficialWarning or DisasterEvent records, and an entry here. Do not add an
 * entry for a feed that has not been fetched and parsed successfully.
 */
export type OfficialSourceId = "bipad" | "sachet" | "nws";

export interface OfficialSource {
  id: OfficialSourceId;
  name: string;
  publisher: string;
  url: string;
  /** Incidents carry casualty counts; warnings are forecasts and advisories. */
  kind: "incidents" | "warnings";
}

export interface CountryProfile {
  code: string;
  name: string;
  official: OfficialSource | null;
  /** Verified casualty totals exist for this country. */
  casualties: boolean;
  /** The road advisory needs incident-level locations; see sources/roads.ts. */
  roads: boolean;
  /** Used to bucket days in charts, so "today" means today there. */
  timeZone: string;
}

const OFFICIAL: Partial<Record<string, OfficialSource>> = {
  NP: {
    id: "bipad",
    name: "BIPAD Portal",
    publisher: "Government of Nepal",
    url: "https://bipadportal.gov.np/",
    kind: "incidents",
  },
  IN: {
    id: "sachet",
    name: "SACHET",
    publisher: "National Disaster Management Authority, India",
    url: "https://sachet.ndma.gov.in/",
    kind: "warnings",
  },
  US: {
    id: "nws",
    name: "National Weather Service",
    publisher: "NOAA, United States",
    url: "https://www.weather.gov/",
    kind: "warnings",
  },
};

/** The first zone listed for a country in zone.tab is its most populous. */
const PRIMARY_ZONE = new Map<string, string>();
for (const [zone, code] of Object.entries(timezones as Record<string, string>)) {
  if (!PRIMARY_ZONE.has(code)) PRIMARY_ZONE.set(code, zone);
}

export function profileFor(code: string): CountryProfile {
  return {
    code,
    name: countryName(code),
    official: OFFICIAL[code] ?? null,
    casualties: code === "NP",
    roads: code === "NP",
    timeZone: PRIMARY_ZONE.get(code) ?? "UTC",
  };
}

export const OFFICIAL_SOURCES = OFFICIAL;
