"use client";

import { useMemo, useState } from "react";
import { Globe } from "@phosphor-icons/react/dist/ssr";
import { SeverityBadge } from "./SeverityBadge";
import { SEVERITY_STYLE, compact, relativeTime } from "@/lib/display";
import { countryName } from "@/lib/countries";
import { HAZARD_LABEL, type DisasterEvent } from "@/lib/types";

/**
 * What is happening elsewhere in the world.
 *
 * Ranked by gravity rather than recency: a red alert from three days ago
 * matters more than a routine wildfire detection from this morning. Grouping
 * by country keeps a single country's 40 bushfire detections from burying
 * every other story.
 */
interface CountryGroup {
  country: string;
  events: DisasterEvent[];
  worstRank: number;
  affected: number;
}

function groupByCountry(events: DisasterEvent[]): CountryGroup[] {
  const groups = new Map<string, CountryGroup>();

  for (const event of events) {
    // Grouped by resolved country, so "India" from GDACS and a USGS place
    // ending "India" land in one card.
    const country = event.country ? countryName(event.country) : null;
    if (!country) continue;

    const group = groups.get(country) ?? {
      country,
      events: [],
      worstRank: -1,
      affected: 0,
    };
    group.events.push(event);
    group.worstRank = Math.max(group.worstRank, SEVERITY_STYLE[event.severity].rank);
    group.affected += event.casualties.affected ?? 0;
    groups.set(country, group);
  }

  for (const group of groups.values()) {
    group.events.sort(
      (a, b) =>
        SEVERITY_STYLE[b.severity].rank - SEVERITY_STYLE[a.severity].rank ||
        Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
    );
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.worstRank - a.worstRank ||
      b.affected - a.affected ||
      b.events.length - a.events.length,
  );
}

const INITIAL_COUNTRIES = 6;

export function GlobalNews({
  events,
  now,
}: {
  events: DisasterEvent[];
  now: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(() => groupByCountry(events), [events]);
  const shown = expanded ? groups : groups.slice(0, INITIAL_COUNTRIES);

  if (groups.length === 0) {
    return (
      <section aria-labelledby="news-heading">
        <h2 id="news-heading" className="mb-1 text-sm font-medium text-ink">
          Elsewhere in the world
        </h2>
        <p className="rounded-3xl border border-dashed border-edge p-8 text-center text-sm text-ink-secondary">
          No international events are being tracked right now.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="news-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="news-heading"
          className="flex items-center gap-1.5 text-sm font-medium text-ink"
        >
          <Globe size={15} weight="duotone" aria-hidden />
          Elsewhere in the world
        </h2>
        <p className="text-xs text-ink-secondary">
          {groups.length} countries affected, most serious first
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((group) => (
          <article
            key={group.country}
            className="flex flex-col rounded-3xl border border-edge bg-surface p-4"
          >
            <header className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-sm font-medium text-ink">{group.country}</h3>
              <SeverityBadge severity={group.events[0].severity} size="sm" />
            </header>

            <p className="mt-1 text-xs text-ink-muted">
              {group.events.length} {group.events.length === 1 ? "event" : "events"} tracked
              {group.affected > 0 && (
                <>
                  {" · "}
                  <span title="Modelled exposure estimate from GDACS, not a verified count">
                    ~{compact(group.affected)} people exposed
                  </span>
                </>
              )}
            </p>

            <ul className="mt-3 space-y-2 border-t border-edge pt-3">
              {group.events.slice(0, 3).map((event) => (
                <li key={event.id} className="flex items-start gap-2 text-xs">
                  <span
                    aria-hidden
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: SEVERITY_STYLE[event.severity].token }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-ink-secondary">{HAZARD_LABEL[event.kind]}</span>
                    {event.metric && (
                      <span className="text-ink-muted"> · {event.metric}</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-ink-muted">
                    {relativeTime(event.occurredAt, now)}
                  </span>
                </li>
              ))}
            </ul>

            {group.events.length > 3 && (
              <p className="mt-2 text-[11px] text-ink-muted">
                and {group.events.length - 3} more
              </p>
            )}
          </article>
        ))}
      </div>

      {groups.length > INITIAL_COUNTRIES && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded border border-edge py-2 text-sm text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink"
        >
          {expanded
            ? "Show fewer countries"
            : `Show all ${groups.length} countries`}
        </button>
      )}
    </section>
  );
}
