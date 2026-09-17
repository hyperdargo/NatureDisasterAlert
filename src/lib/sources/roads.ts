import { z } from "zod";
import { UpstreamError, describeError } from "../fetch-upstream";
import type { DisasterEvent } from "../types";

/**
 * Road advisory for areas with recent landslides and floods.
 *
 * Read this before changing anything here, because the distinction is a safety
 * one, not a technical one.
 *
 * WHAT THIS IS: a proximity advisory. It answers "landslides and floods were
 * reported in the last few days near these highways", which is worth knowing
 * before setting out.
 *
 * WHAT THIS IS NOT: a closure list, and not a list of safe routes. No feed this
 * app consumes publishes live road status for Nepal. BIPAD has fields for road
 * and bridge damage, and across 400 recent incidents every one read zero, so
 * they are captured and shown when present but cannot be leaned on. Inventing
 * an "open routes" list from proximity data would send people onto roads
 * nobody has checked, which during a flood can kill them. Traffic Police on
 * 103 hold the real answer and the interface says so.
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const SEARCH_RADIUS_M = 5_000;
const MAX_INCIDENTS = 6;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export interface RoadAdvisory {
  /** Roads with a recent landslide or flood reported nearby. */
  roads: Array<{ name: string; ref: string | null; classification: string }>;
  /** Districts those incidents were in, so the advice has a location. */
  districts: string[];
  /** Incidents where a road or bridge was actually reported damaged. */
  reportedDamage: Array<{
    id: string;
    title: string;
    area: string | null;
    roads: number;
    bridges: number;
  }>;
  incidentsConsidered: number;
}

const Element = z.object({ tags: z.record(z.string(), z.string()).nullish() });
const Payload = z.object({ elements: z.array(z.unknown()) });

const CLASS_LABEL: Record<string, string> = {
  motorway: "Motorway",
  trunk: "National highway",
  primary: "Highway",
  secondary: "Major road",
};

const CLASS_RANK: Record<string, number> = {
  motorway: 0,
  trunk: 1,
  primary: 2,
  secondary: 3,
};

let cache: { at: number; key: string; advisory: RoadAdvisory } | null = null;
let inFlight: Promise<RoadAdvisory> | null = null;
let lastAttemptAt = 0;

/**
 * Overpass is slow and sometimes unavailable: a query can take 45 seconds or
 * simply hang. Blocking a request on it meant the Roads page sat on "Checking
 * roads" indefinitely, which looks identical to a broken page.
 *
 * So nothing waits on Overpass any more. Whatever is cached is returned at
 * once and a refresh runs behind the request, exactly as the news feed does.
 * The first visitor after a cold start sees the empty state; a minute later
 * the cache is warm and everyone else sees the roads.
 */
const MIN_ATTEMPT_GAP_MS = 2 * 60 * 1000;

async function runOverpass(query: string): Promise<unknown> {
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(45_000),
        headers: {
          "user-agent": "NatureDisasterAlert/0.1 (public safety; open source)",
        },
      });
      if (!response.ok) {
        lastError = new UpstreamError("overpass-roads", `HTTP ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new UpstreamError("overpass-roads", "all mirrors failed");
}

/** One call for every incident, rather than one call each at a rate-limited API. */
function buildQuery(points: Array<{ lat: number; lon: number }>): string {
  const clauses = points
    .map(
      (point) =>
        `  way["highway"~"^(motorway|trunk|primary|secondary)$"]["name"]` +
        `(around:${SEARCH_RADIUS_M},${point.lat},${point.lon});`,
    )
    .join("\n");
  return `[out:json][timeout:40];\n(\n${clauses}\n);\nout tags 60;`;
}

/**
 * Never blocks on Overpass. Returns what is known now and refreshes behind
 * the caller.
 */
export function getRoadAdvisory(events: DisasterEvent[]): RoadAdvisory & { warming: boolean } {
  // Infrastructure damage comes from the feed already in hand, so it is
  // always current even when the road lookup has nothing yet.
  const reportedDamage = events
    .filter(
      (event) =>
        (event.casualties.roadsAffected ?? 0) > 0 ||
        (event.casualties.bridgesAffected ?? 0) > 0,
    )
    .slice(0, 10)
    .map((event) => ({
      id: event.id,
      title: event.title,
      area: event.area?.district ?? event.place,
      roads: event.casualties.roadsAffected ?? 0,
      bridges: event.casualties.bridgesAffected ?? 0,
    }));

  const candidates = pickCandidates(events);
  const key = candidates.map((event) => event.id).join(",");
  const fresh = cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS;

  if (!fresh && candidates.length > 0) refreshInBackground(events, key);

  if (cache) {
    return { ...cache.advisory, reportedDamage, warming: false };
  }

  return {
    roads: [],
    districts: [
      ...new Set(
        candidates.map((e) => e.area?.district).filter((d): d is string => !!d),
      ),
    ],
    reportedDamage,
    incidentsConsidered: candidates.length,
    // Tells the client a retry shortly is worth making.
    warming: candidates.length > 0,
  };
}

function pickCandidates(events: DisasterEvent[]): DisasterEvent[] {
  return events
    .filter((event) => event.country === "NP")
    .filter((event) => event.kind === "landslide" || event.kind === "flood")
    .filter((event) => event.severity !== "good")
    .slice(0, MAX_INCIDENTS);
}

function refreshInBackground(events: DisasterEvent[], key: string) {
  if (inFlight) return;
  if (Date.now() - lastAttemptAt < MIN_ATTEMPT_GAP_MS) return;

  lastAttemptAt = Date.now();
  inFlight = fetchRoadAdvisory(events)
    .then((advisory) => {
      cache = { at: Date.now(), key, advisory };
      return advisory;
    })
    .catch((error) => {
      console.error(`road advisory refresh failed: ${describeError(error)}`);
      return cache?.advisory ?? { roads: [], districts: [], reportedDamage: [], incidentsConsidered: 0 };
    })
    .finally(() => {
      inFlight = null;
    });
}

export async function fetchRoadAdvisory(
  events: DisasterEvent[],
): Promise<RoadAdvisory> {
  // Any incident that actually reported infrastructure damage, at any severity.
  const reportedDamage = events
    .filter((event) => (event.casualties.roadsAffected ?? 0) > 0 || (event.casualties.bridgesAffected ?? 0) > 0)
    .slice(0, 10)
    .map((event) => ({
      id: event.id,
      title: event.title,
      area: event.area?.district ?? event.place,
      roads: event.casualties.roadsAffected ?? 0,
      bridges: event.casualties.bridgesAffected ?? 0,
    }));

  const candidates = events
    .filter((event) => event.country === "NP")
    .filter((event) => event.kind === "landslide" || event.kind === "flood")
    .filter((event) => event.severity !== "good")
    .slice(0, MAX_INCIDENTS);

  const districts = [
    ...new Set(candidates.map((e) => e.area?.district).filter((d): d is string => !!d)),
  ];

  if (candidates.length === 0) {
    return { roads: [], districts, reportedDamage, incidentsConsidered: 0 };
  }

  const key = candidates.map((event) => event.id).join(",");
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.advisory, reportedDamage };
  }

  const payload = Payload.parse(
    await runOverpass(buildQuery(candidates.map((e) => ({ lat: e.lat, lon: e.lon })))),
  );

  // Keyed by road reference plus a normalised name; see the comment below.
  const unique = new Map<
    string,
    { name: string; ref: string | null; classification: string; rank: number }
  >();
  for (const raw of payload.elements) {
    const parsed = Element.safeParse(raw);
    if (!parsed.success) continue;
    const tags = parsed.data.tags ?? {};
    const name = (tags["name:en"] ?? tags.name ?? "").trim();
    if (!name) continue;
    const highway = tags.highway ?? "";
    // A long highway appears as many ways, and OpenStreetMap carries spelling
    // variants of the same road ("Prithvi" and "Prithivi", "Siddhartha" and
    // "Sidhartha"). Keying on a normalised form collapses both, so the list
    // does not show the same highway three times.
    const key = `${(tags.ref ?? "").trim()}|${name.toLowerCase().replace(/[^a-z]/g, "")}`
      .replace(/(prith?i?vi)/, "prithvi")
      .replace(/(sidd?h?arth?a)/, "siddhartha");
    unique.set(key, {
      name,
      ref: tags.ref?.trim() || null,
      classification: CLASS_LABEL[highway] ?? "Road",
      rank: CLASS_RANK[highway] ?? 9,
    });
  }

  const roads = [...unique.values()]
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .slice(0, 12)
    // rank was only for ordering; it is not part of the public shape.
    .map((road) => ({
      name: road.name,
      ref: road.ref,
      classification: road.classification,
    }));

  const advisory: RoadAdvisory = {
    roads,
    districts,
    reportedDamage,
    incidentsConsidered: candidates.length,
  };
  cache = { at: Date.now(), key, advisory };
  return advisory;
}
