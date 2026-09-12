import { z } from "zod";
import { describeError, fetchJson } from "../fetch-upstream";

/**
 * Nepal's administrative hierarchy, from the BIPAD portal.
 *
 * ward -> municipality -> district -> province
 *
 * Incidents reference a ward id and nothing else, so without this lookup an
 * incident can only ever say "somewhere at these coordinates". With it, a
 * report can name the municipality and district people actually recognise,
 * and events can be grouped by the areas that authorities organise around.
 *
 * These tables change at most once an electoral cycle, so they are fetched
 * once and held for a day. The ward table is the large one at roughly 1.4 MB;
 * only the id-to-municipality mapping is retained, which is a few hundred
 * kilobytes of numbers.
 */
const BASE = "https://bipadportal.gov.np/api/v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const Named = z.object({
  id: z.number(),
  title: z.string().nullish(),
  title_en: z.string().nullish(),
  title_ne: z.string().nullish(),
});

const Province = Named;
const District = Named.extend({ province: z.number().nullish() });
const Municipality = Named.extend({
  district: z.number().nullish(),
  type: z.string().nullish(),
});
const Ward = z.object({
  id: z.number(),
  title: z.string().nullish(),
  municipality: z.number().nullish(),
});

const Page = z.object({ results: z.array(z.unknown()) });

export interface Area {
  ward: string | null;
  municipality: string | null;
  municipalityNe: string | null;
  district: string | null;
  districtNe: string | null;
  province: string | null;
  /** Stable key for grouping, so two spellings never split one district. */
  districtId: number | null;
}

interface GeoIndex {
  wardToMunicipality: Map<number, { ward: string | null; municipality: number | null }>;
  municipalities: Map<number, { en: string; ne: string; district: number | null }>;
  districts: Map<number, { en: string; ne: string; province: number | null }>;
  provinces: Map<number, string>;
}

let cache: { index: GeoIndex; loadedAt: number } | null = null;
let inFlight: Promise<GeoIndex> | null = null;

function englishName(row: z.infer<typeof Named>): string {
  return (row.title_en ?? row.title ?? "").trim();
}

async function fetchAll<T>(
  endpoint: string,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const page = Page.parse(
    await fetchJson(`${BASE}/${endpoint}/?limit=10000`, {
      source: `bipad-${endpoint}`,
      revalidate: 86_400,
      timeoutMs: 25_000,
    }),
  );
  const rows: T[] = [];
  for (const raw of page.results) {
    const parsed = schema.safeParse(raw);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

async function build(): Promise<GeoIndex> {
  const [provinces, districts, municipalities, wards] = await Promise.all([
    fetchAll("province", Province),
    fetchAll("district", District),
    fetchAll("municipality", Municipality),
    fetchAll("ward", Ward),
  ]);

  return {
    provinces: new Map(provinces.map((p) => [p.id, englishName(p)])),
    districts: new Map(
      districts.map((d) => [
        d.id,
        { en: englishName(d), ne: (d.title_ne ?? "").trim(), province: d.province ?? null },
      ]),
    ),
    municipalities: new Map(
      municipalities.map((m) => [
        m.id,
        {
          // "Belbari Municipality" reads better than a bare "Belbari".
          en: [englishName(m), m.type].filter(Boolean).join(" ").trim(),
          ne: (m.title_ne ?? "").trim(),
          district: m.district ?? null,
        },
      ]),
    ),
    wardToMunicipality: new Map(
      wards.map((w) => [
        w.id,
        { ward: w.title?.trim() || null, municipality: w.municipality ?? null },
      ]),
    ),
  };
}

/**
 * Returns the index, building it at most once even under concurrent callers.
 * A failure here must not take the feed down, so callers treat it as optional.
 */
export async function getGeoIndex(): Promise<GeoIndex | null> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.index;
  if (inFlight) return inFlight.catch(() => null);

  inFlight = build();
  try {
    const index = await inFlight;
    cache = { index, loadedAt: Date.now() };
    return index;
  } catch (error) {
    console.error(`geography index failed to build: ${describeError(error)}`);
    // Serve a stale index rather than dropping place names entirely.
    return cache?.index ?? null;
  } finally {
    inFlight = null;
  }
}

export function resolveArea(index: GeoIndex | null, wardId: number | null): Area | null {
  if (!index || wardId === null) return null;

  const ward = index.wardToMunicipality.get(wardId);
  if (!ward) return null;

  const municipality =
    ward.municipality !== null ? index.municipalities.get(ward.municipality) : undefined;
  const district =
    municipality?.district != null ? index.districts.get(municipality.district) : undefined;
  const province =
    district?.province != null ? index.provinces.get(district.province) : undefined;

  return {
    ward: ward.ward,
    municipality: municipality?.en || null,
    municipalityNe: municipality?.ne || null,
    district: district?.en || null,
    districtNe: district?.ne || null,
    province: province || null,
    districtId: municipality?.district ?? null,
  };
}

/** "Belbari Municipality-8, Morang" - the way an address is actually said. */
export function formatArea(area: Area | null): string | null {
  if (!area) return null;
  const local = [area.municipality, area.ward].filter(Boolean).join("-");
  return [local || null, area.district].filter(Boolean).join(", ") || null;
}
