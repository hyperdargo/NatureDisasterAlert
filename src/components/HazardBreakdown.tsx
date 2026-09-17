"use client";

import { useState } from "react";
import type { HazardCount } from "@/lib/stats";

/**
 * Which hazards actually happen, and which of them kill.
 *
 * Bar length encodes incident count on a single scale. Deaths are shown as a
 * figure beside each bar rather than as a second bar on a second axis, because
 * the two quantities differ by an order of magnitude and a dual axis would
 * invite a false comparison. One axis, one encoding.
 */
export function HazardBreakdown({
  hazards,
  showDeaths = true,
}: {
  hazards: HazardCount[];
  /** False where no source counts deaths, so nothing reads as "no deaths". */
  showDeaths?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (hazards.length === 0) {
    return (
      <figure className="m-0">
        <h3 className="mb-1 text-sm font-medium text-ink">Hazards by frequency</h3>
        <p className="rounded border border-dashed border-edge p-6 text-center text-xs text-ink-secondary">
          No incidents recorded in this period.
        </p>
      </figure>
    );
  }

  const ranked = [...hazards].sort((a, b) => b.incidents - a.incidents);
  const max = Math.max(...ranked.map((h) => h.incidents));
  const totalDead = ranked.reduce((sum, h) => sum + h.dead, 0);

  return (
    <figure className="m-0">
      <h3 className="mb-1 text-sm font-medium text-ink">Hazards by frequency</h3>
      <p className="mb-4 text-xs text-ink-secondary">
        {showDeaths
          ? "Bar length is incidents logged. Deaths are listed separately."
          : "Bar length is events tracked. No source here reports casualties."}
      </p>

      <ul className="space-y-2.5">
        {ranked.map((hazard) => {
          const share = (hazard.incidents / max) * 100;
          const dimmed = hovered !== null && hovered !== hazard.kind;
          return (
            <li
              key={hazard.kind}
              onMouseEnter={() => setHovered(hazard.kind)}
              onMouseLeave={() => setHovered(null)}
              className={`grid ${showDeaths ? "grid-cols-[minmax(0,9.5rem)_1fr_auto]" : "grid-cols-[minmax(0,9.5rem)_1fr]"} items-center gap-3 text-xs transition-opacity`}
              style={{ opacity: dimmed ? 0.5 : 1 }}
            >
              <span className="truncate text-ink-secondary" title={hazard.label}>
                {hazard.label}
              </span>

              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 rounded-r-[3px]"
                  style={{
                    width: `${Math.max(share, 1.5)}%`,
                    // Single series, so one hue carries the whole scale.
                    background: "var(--series-1)",
                  }}
                />
                <span className="tabular text-ink-muted">{hazard.incidents}</span>
              </span>

              {showDeaths && (
                <span
                  className="tabular whitespace-nowrap"
                  style={{
                    color: hazard.dead > 0 ? "var(--status-critical)" : "var(--ink-muted)",
                  }}
                >
                  {hazard.dead > 0 ? `${hazard.dead} died` : "no deaths"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {showDeaths && (
      <p className="mt-4 border-t border-edge pt-3 text-xs text-ink-secondary">
        {totalDead > 0
          ? `${totalDead} deaths across ${ranked.length} hazard types.`
          : "No deaths reported in this period."}
      </p>
      )}
    </figure>
  );
}
