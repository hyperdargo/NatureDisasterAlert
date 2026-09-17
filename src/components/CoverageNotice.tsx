import { Info } from "@phosphor-icons/react/dist/ssr";

/**
 * The most important paragraph on the page.
 *
 * The figures above this notice count individual incident reports filed to
 * BIPAD. They are NOT Nepal's national disaster death toll, and during a large
 * disaster the two diverge enormously. A worked example from this project's
 * own testing: across the whole 2026 monsoon, BIPAD's incident log recorded
 * 196 deaths, never more than seven on any single day, while international
 * press reported roughly 1,300 dead from the late-August floods. GDACS raised
 * a Red flood alert for exactly that window but published no casualty figure.
 *
 * No feed this app can reach publishes the authoritative national toll.
 * ReliefWeb does, but it requires an approved application name.
 *
 * Given that, the only honest options were to drop the numbers or to label
 * them precisely. Dropping them loses the district-level detail that is
 * genuinely useful and genuinely accurate. So they stay, and this notice sits
 * directly beneath them, because a reader who takes "28 died" as the national
 * toll has been misled by us, not by the source.
 */
export function CoverageNotice({
  deathsInWindow,
  sourceName = "BIPAD",
}: {
  deathsInWindow: number;
  sourceName?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-3xl border border-edge bg-surface px-5 py-4">
      <Info size={16} weight="fill" className="mt-px shrink-0 text-ink-muted" aria-hidden />
      <div className="min-w-0 text-xs leading-relaxed text-ink-secondary">
        <p>
          <strong className="font-medium text-ink">
            These are incident reports, not the national death toll.
          </strong>{" "}
          The {deathsInWindow.toLocaleString("en-US")} deaths above come from
          individual reports filed to the government&rsquo;s {sourceName} portal. That
          log undercounts large disasters badly: during a major flood, national
          figures published by the press and the UN have been many times higher
          than the sum of these reports.
        </p>
        <p className="mt-1.5">
          Treat the numbers here as a floor and a guide to which districts are
          being hit, not as a total. For national figures, see the News tab
          and official statements from the NDRRMA.
        </p>
      </div>
    </div>
  );
}
