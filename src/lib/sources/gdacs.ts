import { XMLParser } from "fast-xml-parser";
import { fetchText } from "../fetch-upstream";
import { isInNepal } from "../geo";
import {
  EMPTY_CASUALTIES,
  type DisasterEvent,
  type HazardKind,
  type Severity,
} from "../types";

/**
 * GDACS - Global Disaster Alert and Coordination System, run by the European
 * Commission's Joint Research Centre. Open, no key.
 * https://www.gdacs.org/
 *
 * GDACS publishes *modelled* impact estimates, not verified counts. Its
 * population figure is fed into `affected` and is always labelled as an
 * estimate in the UI; it is never mixed into a reported death toll.
 */
const FEED = "https://www.gdacs.org/xml/rss.xml";

const TYPE_TO_KIND: Record<string, HazardKind> = {
  EQ: "earthquake",
  TC: "cyclone",
  FL: "flood",
  DR: "drought",
  WF: "fire",
  VO: "volcano",
};

/** GDACS uses a three-level scale; there is no yellow tier. */
const ALERT_TO_SEVERITY: Record<string, Severity> = {
  green: "good",
  orange: "serious",
  red: "critical",
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Strips the gdacs:/geo:/dc: prefixes so fields read as plain names.
  removeNSPrefix: true,
  trimValues: true,
});

function text(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object" && "#text" in v) {
    return text((v as Record<string, unknown>)["#text"]);
  }
  return null;
}

function attrNumber(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const raw = (v as Record<string, unknown>)["@_value"];
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function fetchGdacs(): Promise<DisasterEvent[]> {
  const xml = await fetchText(FEED, {
    source: "gdacs",
    revalidate: 300,
    timeoutMs: 20_000,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;

  const channel = (doc?.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const rawItems = channel?.item;
  const items: unknown[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const events: DisasterEvent[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;

    const point = item.Point as Record<string, unknown> | undefined;
    const lat = Number(text(point?.lat));
    const lon = Number(text(point?.long));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const eventId = text(item.eventid);
    const eventType = text(item.eventtype);
    if (!eventId || !eventType) continue;

    const when = text(item.fromdate) ?? text(item.pubDate);
    const occurredAt = when ? new Date(when) : null;
    if (!occurredAt || Number.isNaN(occurredAt.getTime())) continue;

    const alert = (text(item.alertlevel) ?? "green").toLowerCase();
    const country = text(item.country);
    const affected = attrNumber(item.population);

    const name = text(item.eventname);
    const kind = TYPE_TO_KIND[eventType] ?? "other";

    events.push({
      id: `gdacs-${eventType}-${eventId}`,
      source: "gdacs",
      kind,
      severity: ALERT_TO_SEVERITY[alert] ?? "good",
      title: name ? `${labelFor(kind)} ${name}` : labelFor(kind),
      titleNe: null,
      place: country,
      lat,
      lon,
      occurredAt: occurredAt.toISOString(),
      casualties: {
        ...EMPTY_CASUALTIES,
        // Modelled exposure estimate, never a verified count.
        affected: affected !== null && affected > 0 ? Math.round(affected) : null,
      },
      metric: text(item.severity),
      url: text(item.link),
      inNepal: isInNepal(lat, lon),
      area: null,
    });
  }
  return events;
}

function labelFor(kind: HazardKind): string {
  const names: Partial<Record<HazardKind, string>> = {
    earthquake: "Earthquake",
    cyclone: "Cyclone",
    flood: "Flood",
    drought: "Drought",
    fire: "Wildfire",
    volcano: "Volcanic activity",
  };
  return names[kind] ?? "Hazard";
}
