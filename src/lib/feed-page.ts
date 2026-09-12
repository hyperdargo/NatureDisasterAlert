import { getFeed } from "@/lib/aggregate";
import { computeStats } from "@/lib/stats";
import type { FeedPayload } from "@/hooks/useLiveFeed";

/** Every tab shows the same window, so it is defined once. */
export const WINDOW_DAYS = 30;

/**
 * True when building the static shell that ships inside the Android app.
 *
 * Those pages must not carry a snapshot. Baking the feed into the HTML added
 * roughly 1.2MB to every page, for data the app discards and refetches the
 * moment it opens, and shipping month-old casualty figures inside an installed
 * app is exactly the failure this project keeps guarding against.
 */
const IS_PACKAGED_BUILD = (process.env.NEXT_PUBLIC_API_BASE ?? "") !== "";

/** An empty payload the client replaces on mount. */
function emptyPayload(): FeedPayload {
  return {
    nepal: [],
    global: [],
    stats: computeStats([], WINDOW_DAYS),
    degraded: [],
    // Epoch, so useLiveFeed always treats it as stale and refetches at once.
    generatedAt: new Date(0).toISOString(),
    pending: true,
  };
}

/**
 * Server-side feed for a page render.
 *
 * Each tab calls this, and Next's fetch cache means the upstream work happens
 * once per revalidation window rather than once per tab. A total failure
 * returns an empty payload instead of throwing, so a dead upstream renders an
 * empty state rather than an error page.
 */
export async function loadFeedPayload(): Promise<FeedPayload> {
  if (IS_PACKAGED_BUILD) return emptyPayload();

  try {
    const feed = await getFeed(WINDOW_DAYS);
    const nepal = feed.events.filter((event) => event.inNepal);
    return {
      nepal,
      global: feed.events.filter((event) => !event.inNepal),
      stats: computeStats(nepal, WINDOW_DAYS),
      degraded: feed.degraded,
      generatedAt: feed.generatedAt,
    };
  } catch (error) {
    console.error("feed unavailable for page render:", error);
    return {
      nepal: [],
      global: [],
      stats: computeStats([], WINDOW_DAYS),
      degraded: ["all sources"],
      generatedAt: new Date().toISOString(),
    };
  }
}
