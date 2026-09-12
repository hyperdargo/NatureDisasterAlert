"use client";

import { GlobalNews } from "./GlobalNews";
import { NewsFeed } from "./NewsFeed";
import { useLiveFeed, type FeedPayload } from "@/hooks/useLiveFeed";
import { useNow } from "@/hooks/useBrowserState";

/**
 * Press coverage, and what is happening elsewhere in the world.
 *
 * Both belong together and neither belongs on the home screen: they are
 * context, not a warning. Keeping them here is what let the home tab shrink to
 * the question that matters in an emergency.
 */
export function NewsView({
  initial,
  days,
}: {
  initial: FeedPayload;
  days: number;
}) {
  const { data } = useLiveFeed(initial, days, false);
  // Ticks each minute, seeded from the server clock so the first render
  // matches on both sides and relative stamps age on their own.
  const now = useNow(Date.parse(data.generatedAt));

  return (
    <div className="space-y-8">
      <NewsFeed now={now} />
      <GlobalNews events={data.global} now={now} />
    </div>
  );
}
