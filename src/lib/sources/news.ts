import { XMLParser } from "fast-xml-parser";
import { countryName } from "../countries";
import { describeError, fetchText } from "../fetch-upstream";

/**
 * Press coverage of disasters in a country, from Google News RSS. Free, no key.
 *
 * Chosen over GDELT after testing both. GDELT is a research corpus: it answers
 * in about 15 seconds, throttles to roughly one request every few seconds per
 * IP, and returns a long multilingual tail needing heavy filtering. Google News
 * answers in well under a second, names the publisher in its own field, and
 * surfaces the outlets people actually recognise.
 *
 * One limitation carries over and shapes the presentation: this is a keyword
 * search. It can tell us an article concerns a flood in a country; it cannot
 * tell us the article is about a particular logged incident. So articles are
 * never pinned to an individual incident, and the heading says what they are.
 *
 * Google publishes a fixed set of country editions. The country's English
 * edition is tried first, which ranks local outlets higher; countries without
 * one redirect, and those fall back to the US edition, remembered per country.
 */
const QUERY_TERMS =
  "(flood OR landslide OR earthquake OR cyclone OR typhoon OR hurricane OR wildfire OR storm OR tsunami OR disaster)";

function feedUrl(country: string, edition: "local" | "us"): string {
  const gl = edition === "local" ? country : "US";
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(`"${countryName(country)}" ${QUERY_TERMS}`) +
    `&hl=en-${gl}&gl=${gl}&ceid=${gl}:en`
  );
}

/** Extra words that name a place in headlines without the country name. */
const PLACE_EXTRA: Record<string, string[]> = {
  NP: ["nepali", "nepalese", "kathmandu", "pokhara", "terai"],
  IN: ["indian", "kerala", "assam", "mumbai", "delhi", "himachal", "uttarakhand", "odisha"],
  // Not a bare "us": it matches the pronoun in half the headlines.
  US: ["u\\.s\\.", "american", "texas", "california", "florida"],
  GB: ["uk", "british", "england", "scotland", "wales"],
  BD: ["bangladeshi", "dhaka"],
  PK: ["pakistani", "karachi", "lahore", "punjab", "sindh"],
  PH: ["philippine", "filipino", "manila", "luzon", "mindanao"],
  JP: ["japanese", "tokyo"],
  CN: ["chinese", "beijing"],
  ID: ["indonesian", "jakarta", "java", "sumatra"],
};

function placePattern(country: string): RegExp {
  const words = [escapeRegExp(countryName(country)), ...(PLACE_EXTRA[country] ?? [])];
  return new RegExp(`\\b(${words.join("|")})\\b`, "i");
}

export interface NewsArticle {
  title: string;
  url: string;
  /** Publisher name as given by the feed, e.g. "Reuters". */
  outlet: string;
  publishedAt: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) {
    return text((value as Record<string, unknown>)["#text"]);
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NEWS_TTL_MS = 20 * 60 * 1000;
const MIN_UPSTREAM_GAP_MS = 30_000;
/**
 * A ceiling on upstream calls across every country together. Without it,
 * requesting each of 200 countries in turn would make this server send 200
 * searches to Google in a minute on someone else's behalf.
 */
const UPSTREAM_BUDGET = { max: 30, windowMs: 10 * 60 * 1000 };
const MAX_CACHED_COUNTRIES = 250;

interface CountryNews {
  articles: NewsArticle[];
  at: number;
}

const newsCache = new Map<string, CountryNews>();
const newsInFlight = new Map<string, Promise<void>>();
const lastUpstreamAt = new Map<string, number>();
const noLocalEdition = new Set<string>();
let budget = { used: 0, resetAt: 0 };

function takeBudget(): boolean {
  const now = Date.now();
  if (now >= budget.resetAt) budget = { used: 0, resetAt: now + UPSTREAM_BUDGET.windowMs };
  if (budget.used >= UPSTREAM_BUDGET.max) return false;
  budget.used += 1;
  return true;
}

function refreshInBackground(country: string, limit: number) {
  if (newsInFlight.has(country)) return;
  if (Date.now() - (lastUpstreamAt.get(country) ?? 0) < MIN_UPSTREAM_GAP_MS) return;
  if (!takeBudget()) return;

  lastUpstreamAt.set(country, Date.now());
  const pending = fetchFromGoogleNews(country, limit)
    .then((articles) => {
      newsCache.set(country, { articles, at: Date.now() });
      if (newsCache.size > MAX_CACHED_COUNTRIES) {
        const oldest = [...newsCache].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) newsCache.delete(oldest[0]);
      }
    })
    .catch((error) => {
      // A stale copy beats an empty one, so the cache is left in place.
      console.error(`news refresh failed (${country}): ${describeError(error)}`);
    })
    .finally(() => {
      newsInFlight.delete(country);
    });
  newsInFlight.set(country, pending);
}

/**
 * Never blocks on the upstream. Returns what is known right now and refreshes
 * behind the request, so one cached copy per country is shared by everyone.
 */
export function getNews(
  country = "NP",
  limit = 12,
): { articles: NewsArticle[]; warming: boolean } {
  const cached = newsCache.get(country);
  const fresh = cached && Date.now() - cached.at < NEWS_TTL_MS;
  if (!fresh) refreshInBackground(country, limit);

  return {
    articles: cached?.articles ?? [],
    // Tells the client a retry shortly is worth making.
    warming: !cached,
  };
}

async function fetchEdition(country: string): Promise<string> {
  const options = {
    source: "google-news",
    revalidate: 900,
    timeoutMs: 15_000,
    accept: "application/rss+xml, application/xml, */*",
  };
  if (!noLocalEdition.has(country) && country !== "US") {
    try {
      const xml = await fetchText(feedUrl(country, "local"), options);
      if (xml.includes("<rss")) return xml;
    } catch {
      /* No edition for this country; fall through to the US edition. */
    }
    noLocalEdition.add(country);
  }
  return fetchText(feedUrl(country, "us"), options);
}

async function fetchFromGoogleNews(country: string, limit: number): Promise<NewsArticle[]> {
  const xml = await fetchEdition(country);
  const placeTerms = placePattern(country);

  const doc = parser.parse(xml) as Record<string, unknown>;
  const channel = (doc?.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const rawItems = channel?.item;
  const items: unknown[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const seenOutlets = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;

    const outlet = text(item.source);
    const rawTitle = text(item.title);
    const link = text(item.link);
    const pubDate = text(item.pubDate);
    if (!rawTitle || !link || !outlet || !pubDate) continue;

    // Google appends " - Outlet" to every headline; drop the duplication.
    const title = rawTitle
      .replace(new RegExp(`\\s*[-|]\\s*${escapeRegExp(outlet)}\\s*$`), "")
      .trim();
    if (!title || !placeTerms.test(title)) continue;

    // One story per outlet, so a single wire pickup cannot fill the list.
    if (seenOutlets.has(outlet)) continue;

    const published = new Date(pubDate);
    if (Number.isNaN(published.getTime())) continue;

    let safeUrl: string;
    try {
      const parsed = new URL(link);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
      safeUrl = parsed.toString();
    } catch {
      continue;
    }

    seenOutlets.add(outlet);
    articles.push({ title, url: safeUrl, outlet, publishedAt: published.toISOString() });

    if (articles.length >= limit) break;
  }

  return articles;
}
