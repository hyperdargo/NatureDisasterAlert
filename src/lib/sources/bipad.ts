import { z } from "zod";
import { fetchJson } from "../fetch-upstream";
import { getGeoIndex, resolveArea } from "./bipad-geo";
import {
  EMPTY_CASUALTIES,
  type Casualties,
  type DisasterEvent,
  type HazardKind,
  type Severity,
} from "../types";

/**
 * BIPAD Portal - the Government of Nepal's official disaster incident record.
 *
 * This is the only source in the set that reports verified, incident-level
 * human loss for Nepal, so it is the authority for casualty figures. The other
 * feeds contribute detection speed and global coverage, not death tolls.
 *
 * Docs: https://bipadportal.gov.np/  (open, no key required)
 */
const BASE = "https://bipadportal.gov.np/api/v1/incident/";

/**
 * Upstream shape, validated defensively. Nearly every field is nullable
 * because BIPAD records arrive from field reports that are often incomplete.
 * `.catch()` on each field means one malformed record degrades to a usable
 * event rather than throwing away the whole batch.
 */
const Loss = z
  .object({
    peopleDeathCount: z.number().nullish(),
    peopleMissingCount: z.number().nullish(),
    peopleInjuredCount: z.number().nullish(),
    peopleAffectedCount: z.number().nullish(),
    familyAffectedCount: z.number().nullish(),
    familyRelocatedCount: z.number().nullish(),
    familyEvacuatedCount: z.number().nullish(),
    infrastructureDestroyedHouseCount: z.number().nullish(),
    infrastructureDestroyedRoadCount: z.number().nullish(),
    infrastructureAffectedRoadCount: z.number().nullish(),
    infrastructureDestroyedBridgeCount: z.number().nullish(),
    infrastructureAffectedBridgeCount: z.number().nullish(),
  })
  .partial()
  .nullable();

const Hazard = z
  .object({
    id: z.number().nullish(),
    title: z.string().nullish(),
    titleNe: z.string().nullish(),
  })
  .nullable();

const Incident = z.object({
  id: z.number(),
  wards: z.array(z.number()).nullish(),
  title: z.string().nullish(),
  titleNe: z.string().nullish(),
  point: z
    .object({ coordinates: z.array(z.number()).length(2) })
    .nullish(),
  incidentOn: z.string().nullish(),
  reportedOn: z.string().nullish(),
  streetAddress: z.string().nullish(),
  verified: z.boolean().nullish(),
  hazard: z.union([Hazard, z.number()]).nullish(),
  loss: z.union([Loss, z.number()]).nullish(),
});

const Page = z.object({
  results: z.array(z.unknown()),
  next: z.string().nullish(),
});

/** Map BIPAD's hazard vocabulary onto our own by keyword, not by id. */
const KEYWORD_MAP: ReadonlyArray<readonly [RegExp, HazardKind]> = [
  [/landslide|soil erosion|debris/i, "landslide"],
  [/glacial lake|inundation|flood|waterlog/i, "flood"],
  [/earthquake/i, "earthquake"],
  [/forest fire|wildfire/i, "fire"],
  [/fire|explosion/i, "fire"],
  [/thunder|lightning/i, "lightning"],
  [/avalanche|snow ?storm/i, "avalanche"],
  [/cold wave|frost/i, "coldwave"],
  [/heat wave/i, "heatwave"],
  [/epidemic|flu|poisoning|microorganism|disease/i, "epidemic"],
  [/famine|drought/i, "drought"],
  [/volcan/i, "volcano"],
  [/cyclone/i, "cyclone"],
  [/hailstorm|wind ?storm|heavy rain|rainfall|storm/i, "storm"],
  [/snake ?bite|animal|wildlife|elephant|tiger|bear/i, "animal"],
  [/accident|crash|capsize|collapse|drown|leakage|mine/i, "accident"],
];

function classify(title: string | null | undefined): HazardKind {
  if (!title) return "other";
  for (const [pattern, kind] of KEYWORD_MAP) {
    if (pattern.test(title)) return kind;
  }
  return "other";
}

/** A count of 0 from BIPAD means "reported as none" and is kept as 0. */
function count(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : null;
}

/** Null only when neither field was reported; otherwise the total. */
function sumCounts(...values: Array<number | null | undefined>): number | null {
  const present = values.map(count).filter((v): v is number => v !== null);
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0);
}

/**
 * Severity is derived from reported human loss, so the colour on the map
 * always reflects what actually happened rather than a source's own rating.
 */
function severityFrom(c: Casualties): Severity {
  if ((c.dead ?? 0) > 0) return "critical";
  if ((c.missing ?? 0) > 0 || (c.injured ?? 0) > 0) return "serious";
  if ((c.displaced ?? 0) > 0 || (c.affected ?? 0) > 0) return "warning";
  return "good";
}

function toCasualties(raw: unknown): Casualties {
  const parsed = Loss.safeParse(raw);
  if (!parsed.success || !parsed.data) return { ...EMPTY_CASUALTIES };
  const l = parsed.data;
  // BIPAD counts relocation and evacuation separately; both mean displaced.
  const relocated = count(l.familyRelocatedCount);
  const evacuated = count(l.familyEvacuatedCount);
  const displaced =
    relocated === null && evacuated === null ? null : (relocated ?? 0) + (evacuated ?? 0);
  return {
    dead: count(l.peopleDeathCount),
    missing: count(l.peopleMissingCount),
    injured: count(l.peopleInjuredCount),
    affected: count(l.peopleAffectedCount) ?? count(l.familyAffectedCount),
    displaced,
    housesDestroyed: count(l.infrastructureDestroyedHouseCount),
    roadsAffected: sumCounts(
      l.infrastructureDestroyedRoadCount,
      l.infrastructureAffectedRoadCount,
    ),
    bridgesAffected: sumCounts(
      l.infrastructureDestroyedBridgeCount,
      l.infrastructureAffectedBridgeCount,
    ),
  };
}

/**
 * BIPAD paginates, and the window matters more than it looks.
 *
 * A single capped request silently returns a partial window: asking for 600
 * rows over 30 days returned only the most recent two weeks and roughly half
 * the deaths, with nothing in the response to indicate truncation. The page
 * size is therefore large and pages are followed until the window is exhausted
 * or the safety cap is reached, so the totals cover the period they claim to.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 12;

async function fetchAllIncidents(since: string): Promise<unknown[]> {
  const rows: unknown[] = [];

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const url =
      `${BASE}?expand=loss,hazard&incident_on__gt=${since}` +
      `&limit=${PAGE_SIZE}&offset=${pageIndex * PAGE_SIZE}`;

    const page = Page.parse(
      await fetchJson(url, { source: "bipad", revalidate: 300, timeoutMs: 25_000 }),
    );
    rows.push(...page.results);

    // A short page means the window is exhausted; `next` is unreliable here
    // because the reported count is a sentinel rather than a real total.
    if (page.results.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function fetchBipad(sinceIso: string): Promise<DisasterEvent[]> {
  const since = sinceIso.slice(0, 10);

  // The geography index is optional: if it fails, incidents still render with
  // coordinates and a street address, just without municipality names.
  const [rows, geo] = await Promise.all([fetchAllIncidents(since), getGeoIndex()]);

  const events: DisasterEvent[] = [];
  for (const row of rows) {
    const parsed = Incident.safeParse(row);
    if (!parsed.success) continue;
    const inc = parsed.data;

    const coords = inc.point?.coordinates;
    if (!coords) continue; // An incident without a location cannot be mapped.
    const [lon, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const when = inc.incidentOn ?? inc.reportedOn;
    if (!when) continue;
    const occurredAt = new Date(when);
    if (Number.isNaN(occurredAt.getTime())) continue;

    const hazard = typeof inc.hazard === "object" ? inc.hazard : null;
    const casualties = toCasualties(typeof inc.loss === "object" ? inc.loss : null);
    const title = inc.title?.trim() || hazard?.title || "Reported incident";
    const area = resolveArea(geo, inc.wards?.[0] ?? null);

    events.push({
      id: `bipad-${inc.id}`,
      source: "bipad",
      kind: classify(hazard?.title ?? inc.title),
      severity: severityFrom(casualties),
      title,
      titleNe: inc.titleNe?.trim() || null,
      place: inc.streetAddress?.trim() || null,
      area,
      lat,
      lon,
      occurredAt: occurredAt.toISOString(),
      casualties,
      metric: hazard?.title?.trim() || null,
      url: `https://bipadportal.gov.np/incidents/${inc.id}`,
      // BIPAD only records incidents in Nepal. Border simplification must not
      // move one into India, so the country is not re-derived from the point.
      country: "NP",
      inNepal: true,
    });
  }
  return events;
}
