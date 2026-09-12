import { fetchBipad } from "./sources/bipad";
import { fetchEonet } from "./sources/eonet";
import { fetchGdacs } from "./sources/gdacs";
import { fetchUsgs } from "./sources/usgs";
import { gatherSources } from "./fetch-upstream";
import { haversineKm, NEPAL_BBOX } from "./geo";
import type { Casualties, DisasterEvent, SourceId } from "./types";

export interface Feed {
  events: DisasterEvent[];
  /** Sources that failed this cycle. Surfaced in the UI, never swallowed. */
  degraded: string[];
  generatedAt: string;
}

/**
 * Trust order when two feeds describe the same event.
 * BIPAD wins because it is the only verified, incident-level record for Nepal;
 * USGS outranks the modelled feeds for seismic precision.
 */
const TRUST: Record<SourceId, number> = { bipad: 3, usgs: 2, gdacs: 1, eonet: 0 };

const DEDUPE_RADIUS_KM = 50;
const DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Prefer a reported number over a missing one. Where both feeds report,
 * keep the larger - loss figures are revised upward as reports come in.
 */
function mergeCasualties(a: Casualties, b: Casualties): Casualties {
  const pick = (x: number | null, y: number | null) => {
    if (x === null) return y;
    if (y === null) return x;
    return Math.max(x, y);
  };
  return {
    dead: pick(a.dead, b.dead),
    missing: pick(a.missing, b.missing),
    injured: pick(a.injured, b.injured),
    affected: pick(a.affected, b.affected),
    displaced: pick(a.displaced, b.displaced),
    housesDestroyed: pick(a.housesDestroyed, b.housesDestroyed),
    roadsAffected: pick(a.roadsAffected, b.roadsAffected),
    bridgesAffected: pick(a.bridgesAffected, b.bridgesAffected),
  };
}

/**
 * Collapse the same real-world event reported by several feeds into one record,
 * keeping the most trusted description and the union of what was reported.
 * Deliberately conservative: same hazard type, within 50 km and 12 hours.
 */
function dedupe(events: DisasterEvent[]): DisasterEvent[] {
  const ranked = [...events].sort((a, b) => TRUST[b.source] - TRUST[a.source]);
  const kept: DisasterEvent[] = [];

  for (const candidate of ranked) {
    const when = Date.parse(candidate.occurredAt);
    const match = kept.find((k) => {
      if (k.source === candidate.source) return false;
      if (k.kind !== candidate.kind) return false;
      if (Math.abs(Date.parse(k.occurredAt) - when) > DEDUPE_WINDOW_MS) return false;
      return haversineKm(k.lat, k.lon, candidate.lat, candidate.lon) <= DEDUPE_RADIUS_KM;
    });

    if (match) {
      match.casualties = mergeCasualties(match.casualties, candidate.casualties);
      match.metric ??= candidate.metric;
      match.place ??= candidate.place;
    } else {
      kept.push({ ...candidate, casualties: { ...candidate.casualties } });
    }
  }
  return kept;
}

export async function getFeed(days: number): Promise<Feed> {
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();

  const { events, failed } = await gatherSources<DisasterEvent>([
    { name: "BIPAD Portal", run: () => fetchBipad(sinceIso) },
    // Two seismic passes: everything down to M3 inside Nepal, where a small
    // quake still matters locally, plus significant quakes worldwide.
    { name: "USGS (Nepal)", run: () => fetchUsgs(sinceIso, NEPAL_BBOX) },
    { name: "USGS (global)", run: () => fetchUsgs(sinceIso, null) },
    { name: "GDACS", run: () => fetchGdacs() },
    { name: "NASA EONET", run: () => fetchEonet(sinceIso) },
  ]);

  const cutoff = Date.now() - days * 86_400_000;
  // The two USGS passes overlap on Nepal quakes above M5; collapse by event id.
  const unique = [...new Map(events.map((e) => [e.id, e])).values()];
  const withinWindow = unique.filter((e) => Date.parse(e.occurredAt) >= cutoff);

  const deduped = dedupe(withinWindow).sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );

  return {
    events: deduped,
    degraded: failed,
    generatedAt: new Date().toISOString(),
  };
}
