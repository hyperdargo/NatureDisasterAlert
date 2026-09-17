import { z } from "zod";
import { fetchJson } from "../fetch-upstream";
import { countryForEvent } from "../countries/server";
import { EMPTY_CASUALTIES, type DisasterEvent, type HazardKind } from "../types";

/**
 * NASA EONET - satellite-detected natural events. Open, no key.
 * https://eonet.gsfc.nasa.gov/docs/v3
 *
 * EONET detects; it does not assess impact. Everything here is an advisory
 * with no loss figures attached.
 */
const BASE = "https://eonet.gsfc.nasa.gov/api/v3/events";

const CATEGORY_TO_KIND: Record<string, HazardKind> = {
  wildfires: "fire",
  severeStorms: "storm",
  volcanoes: "volcano",
  floods: "flood",
  landslides: "landslide",
  drought: "drought",
  snow: "avalanche",
  earthquakes: "earthquake",
  temperatureExtremes: "heatwave",
};

const Event = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string().nullish(),
  closed: z.string().nullish(),
  categories: z.array(z.object({ id: z.string().nullish(), title: z.string().nullish() })),
  geometry: z.array(
    z.object({
      date: z.string().nullish(),
      type: z.string().nullish(),
      coordinates: z.unknown(),
    }),
  ),
});

const Payload = z.object({ events: z.array(z.unknown()) });

export async function fetchEonet(sinceIso: string): Promise<DisasterEvent[]> {
  const params = new URLSearchParams({
    status: "open",
    start: sinceIso.slice(0, 10),
    limit: "250",
  });

  const data = Payload.parse(
    await fetchJson(`${BASE}?${params}`, {
      source: "eonet",
      revalidate: 900,
      // The largest payload of the four sources, and reliably the slowest.
      timeoutMs: 25_000,
    }),
  );

  const events: DisasterEvent[] = [];
  for (const row of data.events) {
    const parsed = Event.safeParse(row);
    if (!parsed.success) continue;
    const ev = parsed.data;

    // Use the most recent observation of the event.
    const latest = ev.geometry.at(-1);
    if (!latest || latest.type !== "Point") continue;
    const coords = latest.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lon, lat] = coords as number[];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const when = latest.date ? new Date(latest.date) : null;
    if (!when || Number.isNaN(when.getTime())) continue;

    const categoryId = ev.categories[0]?.id ?? "";
    const country = countryForEvent(lat, lon);
    events.push({
      id: `eonet-${ev.id}`,
      source: "eonet",
      kind: CATEGORY_TO_KIND[categoryId] ?? "other",
      severity: "good",
      title: ev.title,
      titleNe: null,
      place: null,
      lat,
      lon,
      occurredAt: when.toISOString(),
      casualties: { ...EMPTY_CASUALTIES },
      metric: ev.categories[0]?.title?.trim() || null,
      url: ev.link ?? null,
      country,
      inNepal: country === "NP",
      area: null,
    });
  }
  return events;
}
