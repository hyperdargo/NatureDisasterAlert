import { getFeed } from "@/lib/aggregate";
import { computeStats } from "@/lib/stats";
import type { FeedPayload } from "@/hooks/useLiveFeed";

/** Every tab shows the same window, so it is defined once. */
export const WINDOW_DAYS = 30;

/**
 * Server-side feed for a page render.
 *
 * Each tab calls this, and Next's fetch cache means the upstream work happens
 * once per revalidation window rather than once per tab. A total failure
 * returns an empty payload instead of throwing, so a dead upstream renders an
 * empty state rather than an error page.
 */
export async function loadFeedPayload(): Promise<FeedPayload> {
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
