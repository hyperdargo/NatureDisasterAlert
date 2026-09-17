import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { describeError, fetchJson, fetchText } from "../fetch-upstream";
import type { OfficialSourceId } from "../countries/profiles";
import type { OfficialWarning, Severity } from "../types";

/**
 * Official warnings from national agencies, for the countries that publish a
 * keyless public feed. See src/lib/countries/profiles.ts for the list.
 *
 * These are forecasts and advisories, not incidents. They carry no casualty
 * figures and are never merged into the event feed or counted in statistics.
 */

// ---------------------------------------------------------------------------
// India: NDMA SACHET, the national Common Alerting Protocol aggregator.
// https://sachet.ndma.gov.in/  (public domain per the feed's own <copyright>)
// ---------------------------------------------------------------------------

const SACHET_RSS = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml";

/**
 * The RSS index carries the warning text, the issuing agency and the time, but
 * no severity and no expiry; those live in one CAP file per warning. Fetching
 * a hundred CAP files per refresh would hammer a government server, so
 * severity is left null (shown as "Official warning", never as a guessed
 * level) and only warnings issued in the last day are listed.
 */
const SACHET_WINDOW_MS = 24 * 60 * 60 * 1000;

const rss = new XMLParser({ ignoreAttributes: true, trimValues: true });

function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function fetchSachet(): Promise<OfficialWarning[]> {
  const xml = await fetchText(SACHET_RSS, {
    source: "sachet",
    revalidate: 300,
    timeoutMs: 25_000,
    accept: "application/rss+xml, application/xml, */*",
  });
  const doc = rss.parse(xml) as { rss?: { channel?: { item?: unknown } } };
  const raw = doc.rss?.channel?.item;
  const items: unknown[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cutoff = Date.now() - SACHET_WINDOW_MS;

  const warnings: OfficialWarning[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const title = text(item.title)?.replace(/\s+/g, " ");
    const published = text(item.pubDate);
    const guid = text(item.guid);
    if (!title || !published || !guid) continue;
    const issued = new Date(published);
    if (Number.isNaN(issued.getTime()) || issued.getTime() < cutoff) continue;

    // "controlroom@ndma.gov.in (CWC)" -> "CWC"
    const agency = text(item.author)?.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null;

    warnings.push({
      id: `sachet-${guid}`,
      source: "sachet",
      title: title.slice(0, 500),
      event: text(item.category),
      severity: null,
      area: null,
      agency,
      issuedAt: issued.toISOString(),
      expiresAt: null,
      url: safeUrl(text(item.link)),
    });
  }
  return warnings.sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
}

// ---------------------------------------------------------------------------
// United States: National Weather Service active alerts.
// https://www.weather.gov/documentation/services-web-api
// ---------------------------------------------------------------------------

const NWS_ALERTS = "https://api.weather.gov/alerts/active?status=actual&message_type=alert";

const NWS_SEVERITY: Record<string, Severity> = {
  Extreme: "critical",
  Severe: "serious",
  Moderate: "warning",
  Minor: "good",
};

const NwsFeature = z.object({
  properties: z.object({
    id: z.string(),
    "@id": z.string().nullish(),
    event: z.string().nullish(),
    headline: z.string().nullish(),
    severity: z.string().nullish(),
    areaDesc: z.string().nullish(),
    sent: z.string().nullish(),
    expires: z.string().nullish(),
    ends: z.string().nullish(),
    senderName: z.string().nullish(),
  }),
});

const NwsCollection = z.object({ features: z.array(z.unknown()) });

const RANK: Record<Severity, number> = { critical: 3, serious: 2, warning: 1, good: 0 };

async function fetchNws(): Promise<OfficialWarning[]> {
  const data = NwsCollection.parse(
    await fetchJson(NWS_ALERTS, {
      source: "nws",
      revalidate: 300,
      timeoutMs: 25_000,
      accept: "application/geo+json",
    }),
  );

  const warnings: OfficialWarning[] = [];
  for (const raw of data.features) {
    const parsed = NwsFeature.safeParse(raw);
    if (!parsed.success) continue;
    const p = parsed.data.properties;
    const title = p.headline?.trim() || p.event?.trim();
    const sent = p.sent ? new Date(p.sent) : null;
    if (!title || !sent || Number.isNaN(sent.getTime())) continue;
    const ends = p.ends ?? p.expires;
    const expires = ends ? new Date(ends) : null;

    warnings.push({
      id: `nws-${p.id}`,
      source: "nws",
      title: title.slice(0, 500),
      event: p.event?.trim() || null,
      // "Unknown" stays unknown.
      severity: NWS_SEVERITY[p.severity ?? ""] ?? null,
      area: p.areaDesc?.trim().slice(0, 300) || null,
      agency: p.senderName?.trim() || null,
      issuedAt: sent.toISOString(),
      expiresAt: expires && !Number.isNaN(expires.getTime()) ? expires.toISOString() : null,
      url: safeUrl(p["@id"] ?? null),
    });
  }

  return warnings
    .sort(
      (a, b) =>
        (b.severity ? RANK[b.severity] : -1) - (a.severity ? RANK[a.severity] : -1) ||
        Date.parse(b.issuedAt) - Date.parse(a.issuedAt),
    )
    .slice(0, 120);
}

// ---------------------------------------------------------------------------
// Cache, shared by both, served stale while refreshing.
// ---------------------------------------------------------------------------

const FETCHERS: Partial<Record<OfficialSourceId, () => Promise<OfficialWarning[]>>> = {
  sachet: fetchSachet,
  nws: fetchNws,
};

const TTL_MS = 5 * 60 * 1000;
/** Past this, a request waits for fresh data instead of taking the old copy. */
const HARD_TTL_MS = 60 * 60 * 1000;

const cache = new Map<OfficialSourceId, { at: number; warnings: OfficialWarning[] }>();
const inFlight = new Map<OfficialSourceId, Promise<OfficialWarning[]>>();

export function hasWarningFeed(source: OfficialSourceId): boolean {
  return source in FETCHERS;
}

export async function getWarnings(
  source: OfficialSourceId,
): Promise<{ warnings: OfficialWarning[]; fetchedAt: string }> {
  const fetcher = FETCHERS[source];
  if (!fetcher) return { warnings: [], fetchedAt: new Date().toISOString() };

  const cached = cache.get(source);
  const age = cached ? Date.now() - cached.at : Infinity;
  if (cached && age < TTL_MS) {
    return { warnings: cached.warnings, fetchedAt: new Date(cached.at).toISOString() };
  }

  let pending = inFlight.get(source);
  if (!pending) {
    pending = fetcher()
      .then((warnings) => {
        cache.set(source, { at: Date.now(), warnings });
        return warnings;
      })
      .finally(() => inFlight.delete(source));
    inFlight.set(source, pending);
  }

  if (cached && age < HARD_TTL_MS) {
    pending.catch((error) => console.error(`${source} refresh failed: ${describeError(error)}`));
    return { warnings: cached.warnings, fetchedAt: new Date(cached.at).toISOString() };
  }

  const warnings = await pending;
  return { warnings, fetchedAt: new Date().toISOString() };
}
