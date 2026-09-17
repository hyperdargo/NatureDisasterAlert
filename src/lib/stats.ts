import { profileFor } from "./countries/profiles";
import { HAZARD_LABEL, type DisasterEvent, type HazardKind } from "./types";

export interface DayPoint {
  /** YYYY-MM-DD in the country's primary time zone. */
  date: string;
  dead: number;
  missing: number;
  injured: number;
}

export interface HazardCount {
  kind: HazardKind;
  label: string;
  incidents: number;
  dead: number;
}

export interface Totals {
  dead: number;
  missing: number;
  injured: number;
  affected: number;
  displaced: number;
  housesDestroyed: number;
  incidents: number;
}

export interface DistrictCount {
  district: string;
  districtNe: string | null;
  province: string | null;
  incidents: number;
  dead: number;
  injured: number;
  /** Distinct municipalities that reported an incident in this district. */
  municipalities: number;
}

export interface Stats {
  country: string;
  /**
   * True only where a source reports verified casualties (Nepal, via BIPAD).
   * Everywhere else the casualty fields are zero because nothing was counted,
   * not because nobody was hurt, and the interface must not show them.
   */
  casualtiesReported: boolean;
  /** The time zone days were bucketed in. */
  timeZone: string;
  /** Verified totals where casualtiesReported; otherwise only `incidents`. */
  totals: Totals;
  series: DayPoint[];
  byHazard: HazardCount[];
  /** Which parts of the country were hit, worst first. */
  byDistrict: DistrictCount[];
  /** How many districts reported at least one incident. */
  districtsAffected: number;
  /** Modelled exposure from GDACS, reported separately so it is never
   *  confused with a verified count. */
  estimatedAffected: number;
}

/**
 * Casualty totals are computed from BIPAD alone, and so exist only for Nepal.
 *
 * The other feeds publish modelled estimates (GDACS exposure models) or no
 * loss data at all (USGS, EONET). Summing a modelled exposure figure into a
 * reported death toll would produce a number that is not true of anything.
 * Breadth comes from the map; the counts come from the official record.
 */
const VERIFIED_SOURCE = "bipad";

const NO_LOSS = {
  dead: null,
  missing: null,
  injured: null,
  affected: null,
  displaced: null,
  housesDestroyed: null,
} as const;

function dayFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Statistics for one country.
 *
 * Where verified casualty reports exist, everything is computed from them. For
 * every other country the counts are of events tracked by the global feeds in
 * that country, and `casualtiesReported` is false.
 */
export function computeStats(events: DisasterEvent[], days: number, country = "NP"): Stats {
  const profile = profileFor(country);
  const inCountry = events.filter((e) => e.country === country);
  const verified = profile.casualties
    ? inCountry.filter((e) => e.source === VERIFIED_SOURCE)
    : inCountry;
  const localDay = dayFormatter(profile.timeZone);

  const totals: Totals = {
    dead: 0,
    missing: 0,
    injured: 0,
    affected: 0,
    displaced: 0,
    housesDestroyed: 0,
    incidents: verified.length,
  };

  // Pre-seed every day in the window so the axis has no invisible gaps.
  const buckets = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = localDay.format(new Date(Date.now() - i * 86_400_000));
    buckets.set(date, { date, dead: 0, missing: 0, injured: 0 });
  }

  const hazards = new Map<HazardKind, HazardCount>();
  const districts = new Map<string, DistrictCount & { _municipalities: Set<string> }>();

  for (const e of verified) {
    // Global feeds carry modelled exposure at best; never sum it as a count.
    const c = profile.casualties ? e.casualties : NO_LOSS;
    totals.dead += c.dead ?? 0;
    totals.missing += c.missing ?? 0;
    totals.injured += c.injured ?? 0;
    totals.affected += c.affected ?? 0;
    totals.displaced += c.displaced ?? 0;
    totals.housesDestroyed += c.housesDestroyed ?? 0;

    const day = buckets.get(localDay.format(new Date(e.occurredAt)));
    if (day) {
      day.dead += c.dead ?? 0;
      day.missing += c.missing ?? 0;
      day.injured += c.injured ?? 0;
    }

    const hazard = hazards.get(e.kind) ?? {
      kind: e.kind,
      label: HAZARD_LABEL[e.kind],
      incidents: 0,
      dead: 0,
    };
    hazard.incidents += 1;
    hazard.dead += c.dead ?? 0;
    hazards.set(e.kind, hazard);

    // Area affected, keyed on the district id so two spellings cannot split
    // one district into two rows.
    const districtName = e.area?.district;
    if (districtName) {
      const key = String(e.area?.districtId ?? districtName);
      const district = districts.get(key) ?? {
        district: districtName,
        districtNe: e.area?.districtNe ?? null,
        province: e.area?.province ?? null,
        incidents: 0,
        dead: 0,
        injured: 0,
        municipalities: 0,
        _municipalities: new Set<string>(),
      };
      district.incidents += 1;
      district.dead += c.dead ?? 0;
      district.injured += c.injured ?? 0;
      if (e.area?.municipality) district._municipalities.add(e.area.municipality);
      districts.set(key, district);
    }
  }

  const estimatedAffected = inCountry
    .filter((e) => e.source === "gdacs")
    .reduce((sum, e) => sum + (e.casualties.affected ?? 0), 0);

  const byDistrict = [...districts.values()]
    .map(({ _municipalities, ...rest }) => ({
      ...rest,
      municipalities: _municipalities.size,
    }))
    .sort((a, b) => b.dead - a.dead || b.incidents - a.incidents);

  return {
    country,
    casualtiesReported: profile.casualties,
    timeZone: profile.timeZone,
    totals,
    series: [...buckets.values()],
    byHazard: [...hazards.values()].sort(
      (a, b) => b.dead - a.dead || b.incidents - a.incidents,
    ),
    byDistrict,
    districtsAffected: byDistrict.length,
    estimatedAffected,
  };
}
