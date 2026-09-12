import type { Totals } from "@/lib/stats";

/**
 * Headline figures.
 *
 * These count verified incident reports filed with BIPAD, the Government of
 * Nepal's disaster portal. They deliberately exclude the modelled exposure
 * estimates that GDACS publishes: adding a model's guess to a coroner's count
 * produces a number that is not true of anything.
 */
const TILES = [
  { key: "dead", label: "Died", emphasis: true },
  { key: "missing", label: "Missing", emphasis: true },
  { key: "injured", label: "Injured", emphasis: false },
  { key: "displaced", label: "Families displaced", emphasis: false },
  { key: "housesDestroyed", label: "Homes destroyed", emphasis: false },
  { key: "incidents", label: "Incidents logged", emphasis: false },
] as const satisfies ReadonlyArray<{
  key: keyof Totals;
  label: string;
  emphasis: boolean;
}>;

export function StatTiles({ totals, days }: { totals: Totals; days: number }) {
  return (
    <section aria-labelledby="impact-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="impact-heading" className="text-sm font-medium text-ink">
          Incidents reported to BIPAD
        </h2>
        <p className="text-xs text-ink-secondary">
          Last {days} days. Not a national total, see below.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-3 lg:grid-cols-6">
        {TILES.map((tile) => {
          const value = totals[tile.key];
          return (
            <div key={tile.key} className="bg-surface px-3 py-4">
              <dt className="text-[11px] leading-tight text-ink-secondary">{tile.label}</dt>
              <dd
                className="mt-1.5 text-2xl leading-none font-medium"
                style={{
                  // Deaths and missing persons carry the critical hue; the rest
                  // stay in ink so the eye lands on the gravest figure first.
                  color:
                    tile.emphasis && value > 0 ? "var(--status-critical)" : "var(--ink)",
                }}
              >
                {value.toLocaleString("en-US")}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
