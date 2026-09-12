import { XMLParser } from "fast-xml-parser";
import { describeError, fetchText } from "../fetch-upstream";

/**
 * Press coverage of Nepal disasters, from Google News RSS. Free, no key.
 *
 * Chosen over GDELT after testing both. GDELT is a research corpus: it answers
 * in about 15 seconds, throttles to roughly one request every few seconds per
 * IP, and returns a long multilingual tail needing heavy filtering. Google News
 * answers in well under a second, names the publisher in its own field, and
 * surfaces the outlets people actually recognise - Reuters, BBC, the Guardian,
 * UN News - which is what makes the section worth reading at all.
 *
 * One limitation carries over and shapes the presentation: this is a keyword
 * search. It can tell us an article concerns a flood in Nepal; it cannot tell
 * us the article is about the landslide logged in Sindhupalchok on Tuesday. So
 * articles are never pinned to an individual incident, and the heading says
 * exactly what they are.
 */
const FEED =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("Nepal (flood OR landslide OR earthquake OR disaster OR monsoon)") +
  "&hl=en-US&gl=US&ceid=US:en";

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

/** Headlines must still name the place; the query occasionally drifts. */
const PLACE_TERMS = /\bnepal(i|ese)?\b|\bkathmandu\b|\bpokhara\b|\bterai\b/i;

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

let newsCache: { articles: NewsArticle[]; at: number } | null = null;
let newsInFlight: Promise<NewsArticle[]> | null = null;
let lastUpstreamAt = 0;

function refreshInBackground(limit: number) {
  if (newsInFlight) return;
  if (Date.now() - lastUpstreamAt < MIN_UPSTREAM_GAP_MS) return;

  lastUpstreamAt = Date.now();
  newsInFlight = fetchFromGoogleNews(limit)
    .then((articles) => {
      newsCache = { articles, at: Date.now() };
      return articles;
    })
    .catch((error) => {
      // A stale copy beats an empty one, so the cache is left in place.
      console.error(`news refresh failed: ${describeError(error)}`);
      return newsCache?.articles ?? [];
    })
    .finally(() => {
      newsInFlight = null;
    });
}

/**
 * Never blocks on the upstream. Returns what is known right now and refreshes
 * behind the request, so one cached copy is shared by every visitor.
 */
export function getNews(limit = 12): { articles: NewsArticle[]; warming: boolean } {
  const fresh = newsCache && Date.now() - newsCache.at < NEWS_TTL_MS;
  if (!fresh) refreshInBackground(limit);

  return {
    articles: newsCache?.articles ?? [],
    // Tells the client a retry shortly is worth making.
    warming: !newsCache,
  };
}

async function fetchFromGoogleNews(limit: number): Promise<NewsArticle[]> {
  const xml = await fetchText(FEED, {
    source: "google-news",
    revalidate: 900,
    timeoutMs: 15_000,
    accept: "application/rss+xml, application/xml, */*",
  });

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
    if (!title || !PLACE_TERMS.test(title)) continue;

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
