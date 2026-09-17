"use client";

import { useState } from "react";
import type { DistrictCount } from "@/lib/stats";

/**
 * Which parts of the country were hit.
 *
 * Nepal is administered by district, relief is coordinated by district, and
 * people describe where they live by district, so that is the unit here rather
 * than an abstract area in square kilometres. Incidents are point reports, not
 * mapped extents, so a figure like "312 km affected" would be invented; the
 * honest measure is how many districts and municipalities filed a report.
 */
const INITIAL_ROWS = 8;

export function AreaAffected({
  districts,
  // Nepal's 77 districts; this chart only exists for Nepal.
  totalDistricts = 77,
}: {
  districts: DistrictCount[];
  totalDistricts?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (districts.length === 0) {
    return (
      <figure className="m-0">
        <h3 className="mb-1 text-sm font-medium text-ink">Areas affected</h3>
        <p className="rounded border border-dashed border-edge p-6 text-center text-xs text-ink-secondary">
          No incidents with a recorded location in this period.
        </p>
      </figure>
    );
  }

  const shown = expanded ? districts : districts.slice(0, INITIAL_ROWS);
  const max = Math.max(...districts.map((d) => d.incidents));
  const municipalities = districts.reduce((sum, d) => sum + d.municipalities, 0);

  return (
    <figure className="m-0">
      <h3 className="mb-1 text-sm font-medium text-ink">Areas affected</h3>
      <p className="mb-4 text-xs text-ink-secondary">
        {districts.length} of {totalDistricts} districts reported incidents,
        across {municipalities} municipalities.
      </p>

      <ul className="space-y-2.5">
        {shown.map((district) => (
          <li
            key={district.district}
            className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-xs"
          >
            <span className="truncate text-ink-secondary" title={district.district}>
              {district.district}
            </span>

            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 rounded-r-[3px]"
                style={{
                  width: `${Math.max((district.incidents / max) * 100, 1.5)}%`,
                  background: "var(--series-1)",
                }}
              />
              <span className="tabular text-ink-muted">{district.incidents}</span>
            </span>

            <span
              className="tabular whitespace-nowrap"
              style={{
                color: district.dead > 0 ? "var(--status-critical)" : "var(--ink-muted)",
              }}
            >
              {district.dead > 0 ? `${district.dead} died` : "no deaths"}
            </span>
          </li>
        ))}
      </ul>

      {districts.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 w-full rounded border border-edge py-2 text-xs text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink"
        >
          {expanded
            ? "Show fewer districts"
            : `Show all ${districts.length} districts`}
        </button>
      )}
    </figure>
  );
}
