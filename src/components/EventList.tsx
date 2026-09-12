"use client";

import { useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { SeverityBadge } from "./SeverityBadge";
import { ImpactBadge } from "./ImpactBadge";
import { formatAreaLabel, nepalDateTime, relativeTime } from "@/lib/display";
import { HAZARD_LABEL, SOURCE_LABEL, type DisasterEvent, type HazardKind } from "@/lib/types";

const PAGE_SIZE = 12;

/**
 * The full incident log for Nepal, newest first.
 *
 * Casualty figures print as "not reported" when a source left them blank.
 * Rendering an unknown death toll as 0 would be a lie of formatting, and this
 * is the kind of table people screenshot.
 */
export function EventList({
  events,
  now,
}: {
  events: DisasterEvent[];
  now: number;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [kindFilter, setKindFilter] = useState<HazardKind | "all">("all");

  const kinds = [...new Set(events.map((e) => e.kind))].sort((a, b) =>
    HAZARD_LABEL[a].localeCompare(HAZARD_LABEL[b]),
  );
  const filtered =
    kindFilter === "all" ? events : events.filter((e) => e.kind === kindFilter);
  const shown = filtered.slice(0, visible);

  return (
    <section aria-labelledby="log-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h2 id="log-heading" className="text-sm font-medium text-ink">
          Incident log
        </h2>
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Hazard
          <select
            value={kindFilter}
            onChange={(event) => {
              setKindFilter(event.target.value as HazardKind | "all");
              setVisible(PAGE_SIZE);
            }}
            className="rounded border border-edge bg-surface px-2 py-1 text-xs text-ink"
          >
            <option value="all">All types</option>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {HAZARD_LABEL[kind]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-edge p-8 text-center text-sm text-ink-secondary">
          No incidents of this type in the selected period.
        </p>
      ) : (
        <>
          <ul className="overflow-hidden rounded-lg border border-edge">
            {shown.map((event, index) => (
              <li
                key={event.id}
                className={`bg-surface p-4 ${index > 0 ? "border-t border-edge" : ""}`}
              >
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <SeverityBadge severity={event.severity} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{event.title}</p>
                    {event.titleNe && (
                      <p lang="ne" className="font-deva mt-0.5 text-xs text-ink-secondary">
                        {event.titleNe}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-muted">
                      {[
                        HAZARD_LABEL[event.kind],
                        formatAreaLabel(event.area) ?? event.place,
                        event.metric,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs whitespace-nowrap text-ink-secondary">
                      {relativeTime(event.occurredAt, now)}
                    </p>
                    <p className="tabular mt-0.5 text-[11px] whitespace-nowrap text-ink-muted">
                      {nepalDateTime.format(new Date(event.occurredAt))}
                    </p>
                  </div>
                </div>

                <LossRow event={event} />
              </li>
            ))}
          </ul>

          {visible < filtered.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="mt-3 w-full rounded border border-edge py-2 text-sm text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink"
            >
              Show more ({filtered.length - visible} remaining)
            </button>
          )}
        </>
      )}
    </section>
  );
}

function LossRow({ event }: { event: DisasterEvent }) {
  const { dead, missing, injured, displaced, housesDestroyed } = event.casualties;
  const figures = [
    { label: "died", value: dead, grave: true },
    { label: "missing", value: missing, grave: true },
    { label: "injured", value: injured, grave: false },
    { label: "families displaced", value: displaced, grave: false },
    { label: "homes destroyed", value: housesDestroyed, grave: false },
  ].filter((figure) => figure.value !== null && figure.value > 0);

  // A source that reported zero casualties is saying something different from
  // a source that reported nothing at all, and the wording keeps them apart.
  const anyReported = [dead, missing, injured].some((value) => value !== null);

  return (
    <div className="mt-2.5 border-t border-edge pt-2.5">
      <ImpactBadge casualties={event.casualties} showDrivers={false} />

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {figures.length > 0 ? (
          figures.map((figure) => (
            <span
              key={figure.label}
              className="tabular"
              style={{
                color: figure.grave ? "var(--status-critical)" : "var(--ink-secondary)",
              }}
            >
              <strong className="font-medium">{figure.value}</strong> {figure.label}
            </span>
          ))
        ) : (
          <span className="text-ink-muted">
            {anyReported ? "No casualties reported" : "Casualties not reported"}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2 text-ink-muted">
          <span className="hidden sm:inline">{SOURCE_LABEL[event.source]}</span>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink"
            >
              Source
              <ArrowSquareOut size={11} aria-hidden />
            </a>
          )}
        </span>
      </div>
    </div>
  );
}
