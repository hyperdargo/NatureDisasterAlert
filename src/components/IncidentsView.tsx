"use client";

import { useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { AreaAffected } from "./AreaAffected";
import { CasualtyTrend } from "./CasualtyTrend";
import { CoverageNotice } from "./CoverageNotice";
import { useCountry } from "./CountryProvider";
import { EventList } from "./EventList";
import { HazardBreakdown } from "./HazardBreakdown";
import { SeverityBadge } from "./SeverityBadge";
import { StatTiles } from "./StatTiles";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useNow } from "@/hooks/useBrowserState";
import { useWarnings } from "@/hooks/useWarnings";
import { profileFor } from "@/lib/countries/profiles";
import { relativeTime } from "@/lib/display";

/**
 * The reading tab: the full record for the country, with the charts that
 * make sense of it.
 *
 * What it can show depends on the coverage, and it says which:
 *   incidents  verified casualty totals, daily loss, districts, the log.
 *   warnings   the national agency's warnings, then the events tracked.
 *   neither    the events tracked by the global feeds.
 *
 * Not polled on a timer. This is where someone goes to understand what has
 * happened, not to watch it happen, so one fetch on mount is enough.
 */
export function IncidentsView({ days }: { days: number }) {
  const { data } = useLiveFeed(days, false);
  const country = useCountry();
  const now = useNow(Date.parse(data.generatedAt));
  const profile = country.code ? profileFor(country.code) : null;
  const warnings = useWarnings(profile?.official?.kind === "warnings" ? country.code : null);
  // The US feed alone carries over a hundred active alerts at a time.
  const [warningsShown, setWarningsShown] = useState(15);

  if (data.pending || !profile) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <p className="text-sm text-ink-secondary">Loading the latest reports</p>
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-3xl border border-edge bg-surface" />
        ))}
      </div>
    );
  }

  const official = profile.official;
  const name = profile.name;

  return (
    <div className="space-y-10">
      {official?.kind === "incidents" ? (
        <>
          <StatTiles totals={data.stats.totals} days={days} sourceName={official.name} />
          <CoverageNotice deathsInWindow={data.stats.totals.dead} sourceName={official.name} />
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-edge bg-surface p-5">
              <CasualtyTrend series={data.stats.series} />
            </div>
            <div className="rounded-3xl border border-edge bg-surface p-5">
              <HazardBreakdown hazards={data.stats.byHazard} />
            </div>
            <div className="rounded-3xl border border-edge bg-surface p-5">
              <AreaAffected districts={data.stats.byDistrict} />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-edge bg-surface p-5 sm:p-6">
          <p className="max-w-[48rem] text-sm leading-relaxed text-ink-secondary">
            {official
              ? `No source available to this app publishes verified casualty figures for ${name}, so none are shown. Below are the official warnings from ${official.name} and the events that USGS, GDACS and NASA are tracking.`
              : `No source available to this app publishes verified casualty figures or national warnings for ${name}. Below are the events that USGS, GDACS and NASA are tracking there.`}
          </p>
        </div>
      )}

      {official?.kind === "warnings" && (
        <section aria-labelledby="warnings-heading">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="warnings-heading" className="text-sm font-medium text-ink">
              Official warnings · {official.name}
            </h2>
            <a
              href={official.url}
              target="_blank"
              rel="noopener noreferrer"
              className="readout inline-flex items-center gap-1 hover:text-ink"
            >
              {official.publisher} <ArrowSquareOut size={11} aria-hidden />
            </a>
          </div>
          {warnings.status === "loading" && (
            <div className="h-24 animate-pulse rounded-3xl border border-edge bg-surface" role="status" aria-label="Loading warnings" />
          )}
          {warnings.status === "failed" && (
            <p className="rounded-3xl border border-dashed border-edge p-6 text-sm text-ink-secondary">
              The warning feed did not answer. That does not mean there are no warnings.
            </p>
          )}
          {warnings.status === "done" && warnings.warnings.length === 0 && (
            <p className="rounded-3xl border border-edge p-6 text-sm text-ink-secondary">
              No warnings in the feed right now.
            </p>
          )}
          {warnings.warnings.length > 0 && (
            <ul className="divide-y divide-edge overflow-hidden rounded-3xl border border-edge bg-surface">
              {warnings.warnings.slice(0, warningsShown).map((warning) => (
                <li key={warning.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {warning.severity ? (
                      <SeverityBadge severity={warning.severity} size="sm" />
                    ) : (
                      <span className="readout rounded border border-edge-strong px-1.5 py-0.5 text-ink-secondary">
                        Official warning
                      </span>
                    )}
                    {warning.event && <span className="readout text-ink-secondary">{warning.event}</span>}
                    <span className="readout ml-auto">
                      {[warning.agency, relativeTime(warning.issuedAt, now)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink">{warning.title}</p>
                  {warning.area && <p className="mt-1 text-xs text-ink-muted">{warning.area}</p>}
                  {warning.url && (
                    <a
                      href={warning.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-ink-secondary underline underline-offset-2 hover:text-ink"
                    >
                      Full warning <ArrowSquareOut size={11} aria-hidden />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {warnings.warnings.length > warningsShown && (
            <button
              type="button"
              onClick={() => setWarningsShown((shown) => shown + 30)}
              className="press mt-3 min-h-11 w-full rounded-full border border-edge text-sm text-ink-secondary hover:text-ink"
            >
              Show more ({warnings.warnings.length - warningsShown} remaining)
            </button>
          )}
        </section>
      )}

      {official?.kind !== "incidents" && (
        <div className="rounded-3xl border border-edge bg-surface p-5 xl:max-w-[40rem]">
          <HazardBreakdown hazards={data.stats.byHazard} showDeaths={false} />
        </div>
      )}

      <EventList
        events={data.local}
        now={now}
        timeZone={profile.timeZone}
        title={official?.kind === "incidents" ? "Incident log" : `Events tracked in ${name}`}
      />
    </div>
  );
}
