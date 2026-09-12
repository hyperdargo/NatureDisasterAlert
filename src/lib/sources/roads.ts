import { z } from "zod";
import { UpstreamError } from "../fetch-upstream";
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
    .filter((event) => event.inNepal)
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
    // A long highway appears as many ways; one entry per name is enough.
    unique.set(name, {
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
