"use client";

import { AreaAffected } from "./AreaAffected";
import { CasualtyTrend } from "./CasualtyTrend";
import { CoverageNotice } from "./CoverageNotice";
import { EventList } from "./EventList";
import { HazardBreakdown } from "./HazardBreakdown";
import { StatTiles } from "./StatTiles";
import { useLiveFeed, type FeedPayload } from "@/hooks/useLiveFeed";
import { useNow } from "@/hooks/useBrowserState";

/**
 * The reading tab: the full record, with the charts that make sense of it.
 *
 * Not polled on a timer. This is where someone goes to understand what has
 * happened, not to watch it happen, so one fetch on mount is enough and the
 * phone keeps its battery.
 */
export function IncidentsView({
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


  if (data.pending) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <p className="text-sm text-ink-secondary">Loading the latest reports</p>
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-24 animate-pulse rounded-lg border border-edge bg-surface"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <StatTiles totals={data.stats.totals} days={days} />
      <CoverageNotice deathsInWindow={data.stats.totals.dead} />

      {/* Three questions: when it happened, what it was, and where. */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-edge bg-surface p-4 sm:p-5">
          <CasualtyTrend series={data.stats.series} />
        </div>
        <div className="rounded-lg border border-edge bg-surface p-4 sm:p-5">
          <HazardBreakdown hazards={data.stats.byHazard} />
        </div>
        <div className="rounded-lg border border-edge bg-surface p-4 sm:p-5">
          <AreaAffected districts={data.stats.byDistrict} />
        </div>
      </div>

      <EventList events={data.nepal} now={now} />
    </div>
  );
}
