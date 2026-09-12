import { IMPACT_TOKEN, computeImpact } from "@/lib/impact";
import type { Casualties } from "@/lib/types";

/**
 * A one-glance read of how badly an incident hit people.
 *
 * The level is derived here, not reported by any source, so the figures that
 * produced it are printed right beside it. Anyone who doubts the badge can
 * check the arithmetic in the same line.
 */
export function ImpactBadge({
  casualties,
  showDrivers = true,
}: {
  casualties: Casualties;
  showDrivers?: boolean;
}) {
  const impact = computeImpact(casualties);

  if (impact.unknown) {
    return (
      <span className="text-xs text-ink-muted">Impact not reported</span>
    );
  }

  const token = IMPACT_TOKEN[impact.level];

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex items-center gap-1.5">
        {/* Length reads as magnitude; the word carries the meaning on its own. */}
        <span
          aria-hidden
          className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full"
          style={{ background: "var(--grid)" }}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.max(impact.score, 4)}%`, background: token }}
          />
        </span>
        <span className="text-xs font-medium" style={{ color: token }}>
          {impact.label}
        </span>
      </span>

      {showDrivers && impact.drivers.length > 0 && (
        <span className="tabular text-xs text-ink-secondary">
          {impact.drivers
            .map((driver) => `${driver.value.toLocaleString("en-US")} ${driver.label}`)
            .join(" · ")}
        </span>
      )}
    </span>
  );
}
