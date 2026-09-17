import { z } from "zod";
import { fetchJson } from "../fetch-upstream";
import { countryForEvent } from "../countries/server";
import { EMPTY_CASUALTIES, type DisasterEvent, type Severity } from "../types";

/**
 * USGS Earthquake Hazards Program - the fastest authoritative seismic feed.
 * Open, no key. https://earthquake.usgs.gov/fdsnws/event/1/
 *
 * USGS reports shaking, never casualties, so every event from here carries
 * null loss figures. That gap is deliberate and is shown as "not reported".
 */
const BASE = "https://earthquake.usgs.gov/fdsnws/event/1/query";

const Feature = z.object({
  id: z.string(),
  properties: z.object({
    mag: z.number().nullish(),
    place: z.string().nullish(),
    title: z.string().nullish(),
    time: z.number().nullish(),
    url: z.string().nullish(),
    /** PAGER impact alert, present only once USGS has modelled losses. */
    alert: z.enum(["green", "yellow", "orange", "red"]).nullish(),
    tsunami: z.number().nullish(),
  }),
  geometry: z.object({ coordinates: z.array(z.number()).min(2) }),
});

const Collection = z.object({ features: z.array(z.unknown()) });

const PAGER_TO_SEVERITY: Record<string, Severity> = {
  green: "good",
  yellow: "warning",
  orange: "serious",
  red: "critical",
};

/** Fallback when USGS has not yet published a PAGER alert for the event. */
function severityFromMagnitude(mag: number | null | undefined): Severity {
  if (mag === null || mag === undefined) return "good";
  if (mag >= 6.5) return "critical";
  if (mag >= 5.5) return "serious";
  if (mag >= 4.5) return "warning";
  return "good";
}

export async function fetchUsgs(
  sinceIso: string,
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number } | null,
): Promise<DisasterEvent[]> {
  const params = new URLSearchParams({
    format: "geojson",
    starttime: sinceIso,
    // Worldwide down to M4.5, which a person nearby may feel, so every
    // country's "near me" list has its quakes and not only the big ones.
    minmagnitude: bbox ? "3.0" : "4.5",
    orderby: "time",
    limit: bbox ? "400" : "1500",
  });
  if (bbox) {
    params.set("minlatitude", String(bbox.minLat));
    params.set("maxlatitude", String(bbox.maxLat));
    params.set("minlongitude", String(bbox.minLon));
    params.set("maxlongitude", String(bbox.maxLon));
  }

  const data = Collection.parse(
    await fetchJson(`${BASE}?${params}`, { source: "usgs", revalidate: 120 }),
  );

  const events: DisasterEvent[] = [];
  for (const row of data.features) {
    const parsed = Feature.safeParse(row);
    if (!parsed.success) continue;
    const { id, properties: p, geometry } = parsed.data;

    const [lon, lat, depthKm] = geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !p.time) continue;

    const mag = p.mag ?? null;
    const depth = Number.isFinite(depthKm) ? Math.round(depthKm as number) : null;
    const country = countryForEvent(lat, lon, p.place?.split(",").at(-1));

    events.push({
      id: `usgs-${id}`,
      source: "usgs",
      kind: "earthquake",
      severity: p.alert ? PAGER_TO_SEVERITY[p.alert] : severityFromMagnitude(mag),
      title: mag !== null ? `Magnitude ${mag.toFixed(1)} earthquake` : "Earthquake",
      titleNe: null,
      place: p.place?.trim() || null,
      lat,
      lon,
      occurredAt: new Date(p.time).toISOString(),
      casualties: { ...EMPTY_CASUALTIES },
      metric: [
        mag !== null ? `M ${mag.toFixed(1)}` : null,
        depth !== null ? `${depth} km deep` : null,
        p.tsunami ? "tsunami advisory" : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      url: p.url ?? null,
      country,
      inNepal: country === "NP",
      area: null,
    });
  }
  return events;
}
