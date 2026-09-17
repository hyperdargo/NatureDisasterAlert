"use client";

import { useId, useState } from "react";
import { localDate } from "@/lib/display";

/** Series dates are already local calendar days; format them as written. */
const dayLabel = (date: string) => localDate("UTC").format(new Date(`${date}T12:00:00Z`));
import type { DayPoint } from "@/lib/stats";

/**
 * Daily human loss, drawn as small multiples rather than one stacked chart.
 *
 * Deaths run 0-3 a day while injuries run 0-20+. Stacking them, or putting
 * them on one scale, would flatten the death series into an invisible sliver
 * at the bottom of the plot. These are different quantities, not parts of a
 * whole, so each series gets its own row and its own vertical scale, sharing
 * only the time axis. Each row states its own peak so the scales cannot be
 * mistaken for one another.
 */
type SeriesKey = "dead" | "missing" | "injured";

const SERIES: ReadonlyArray<{ key: SeriesKey; label: string; token: string }> = [
  { key: "dead", label: "Died", token: "var(--series-1)" },
  { key: "missing", label: "Missing", token: "var(--series-2)" },
  { key: "injured", label: "Injured", token: "var(--series-3)" },
];

export function CasualtyTrend({ series }: { series: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const tableId = useId();

  if (series.length === 0) return null;

  const active = hover !== null ? series[hover] : null;
  const totals = SERIES.map((s) => ({
    ...s,
    total: series.reduce((sum, d) => sum + d[s.key], 0),
    peak: Math.max(...series.map((d) => d[s.key]), 0),
  }));

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">Daily human loss</h3>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-expanded={asTable}
          aria-controls={tableId}
          className="rounded border border-edge px-2 py-0.5 text-[11px] text-ink-secondary hover:border-edge-strong hover:text-ink"
        >
          {asTable ? "Show chart" : "Show table"}
        </button>
      </figcaption>
      <p className="mb-4 text-xs text-ink-secondary">
        Each row has its own scale. Reported to BIPAD, Nepal time.
      </p>

      {asTable ? (
        <div className="max-h-64 overflow-auto rounded border border-edge">
          <table id={tableId} className="w-full text-xs tabular">
            <thead className="sticky top-0 bg-raised text-ink-secondary">
              <tr>
                <th scope="col" className="p-2 text-left font-medium">Date</th>
                {SERIES.map((s) => (
                  <th key={s.key} scope="col" className="p-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((d) => (
                <tr key={d.date} className="border-t border-edge">
                  <th scope="row" className="p-2 text-left font-normal text-ink-secondary">
                    {dayLabel(d.date)}
                  </th>
                  {SERIES.map((s) => (
                    <td
                      key={s.key}
                      className={`p-2 text-right ${d[s.key] > 0 ? "text-ink" : "text-ink-muted"}`}
                    >
                      {d[s.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" onMouseLeave={() => setHover(null)}>
          <div className="space-y-3">
            {totals.map((s) => (
              <div key={s.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 text-ink-secondary">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-[1px]"
                      style={{ background: s.token }}
                    />
                    {s.label}
                  </span>
                  <span className="tabular text-ink-muted">
                    {s.total === 0 ? "none reported" : `${s.total} total, peak ${s.peak}`}
                  </span>
                </div>
                <div className="flex h-10 items-end gap-[2px]" aria-hidden>
                  {series.map((d, i) => {
                    const value = d[s.key];
                    const height = s.peak === 0 ? 0 : (value / s.peak) * 100;
                    const dimmed = hover !== null && hover !== i;
                    return (
                      <div
                        key={d.date}
                        className="relative flex-1"
                        style={{ height: "100%" }}
                      >
                        {/* Baseline rule keeps empty days legible as zero. */}
                        <span
                          className="absolute inset-x-0 bottom-0 h-px"
                          style={{ background: "var(--axis)" }}
                        />
                        {value > 0 && (
                          <span
                            className="absolute inset-x-0 bottom-0 rounded-t-[3px] transition-opacity"
                            style={{
                              height: `${Math.max(height, 6)}%`,
                              background: s.token,
                              opacity: dimmed ? 0.35 : 1,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Hit targets span the full height so the crosshair is easy to grab. */}
          <div
            className="absolute inset-0 flex gap-[2px]"
            role="group"
            aria-label="Daily casualty figures"
          >
            {series.map((d, i) => (
              <button
                key={d.date}
                type="button"
                className="flex-1 cursor-default"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                aria-label={`${d.date}: ${d.dead} died, ${d.missing} missing, ${d.injured} injured`}
              >
                {hover === i && (
                  <span
                    aria-hidden
                    className="block h-full w-px justify-self-center"
                    style={{ background: "var(--border-strong)", margin: "0 auto" }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="mt-2 flex justify-between text-[10px] tabular text-ink-muted">
            <span>{dayLabel(series[0].date)}</span>
            <span>{dayLabel(series.at(-1)!.date)}</span>
          </div>

          <p
            className="mt-1 min-h-[1.25rem] text-xs tabular text-ink-secondary"
            role="status"
            aria-live="polite"
          >
            {active
              ? `${dayLabel(active.date)}: ${active.dead} died, ${active.missing} missing, ${active.injured} injured`
              : "Hover a day for its figures."}
          </p>
        </div>
      )}
    </figure>
  );
}
