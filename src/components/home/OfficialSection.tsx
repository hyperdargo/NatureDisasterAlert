"use client";

import Link from "next/link";
import { ArrowRight, ArrowSquareOut, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { CoverageNotice } from "../CoverageNotice";
import { StatTiles } from "../StatTiles";
import { SeverityBadge } from "../SeverityBadge";
import { useWarnings } from "@/hooks/useWarnings";
import { profileFor } from "@/lib/countries/profiles";
import { HAZARD_LABEL, type DisasterEvent } from "@/lib/types";
import { relativeTime } from "@/lib/display";
import type { Stats } from "@/lib/stats";

/**
 * What the official record says, for this country. Deliberate stillness: this
 * is reading material, and the numbers in it must never move while read.
 *
 * Three honest shapes, because the coverage genuinely differs:
 *   incidents  Nepal: verified casualty totals, with the caveat beneath.
 *   warnings   India, United States: the national agency's current warnings.
 *   none       Everyone else: say there is no national feed here, and show
 *              the international alerts that do cover the country.
 */
export function OfficialSection({
  country,
  countryName,
  stats,
  local,
  pending,
  now,
}: {
  country: string | null;
  countryName: string | null;
  stats: Stats;
  local: DisasterEvent[];
  pending: boolean;
  now: number;
}) {
  const profile = country ? profileFor(country) : null;
  const warnings = useWarnings(profile?.official?.kind === "warnings" ? country : null);
  if (!profile || !countryName) return null;
  const official = profile.official;

  return (
    <section
      aria-labelledby="official-heading"
      className="mx-auto w-full max-w-[1400px] px-[var(--gutter)] pt-28"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="readout flex items-center gap-2">
            <SealCheck size={13} weight="fill" className="text-ice" aria-hidden />
            {official ? `${official.name} · ${official.publisher}` : "No national feed connected"}
          </p>
          <h2 id="official-heading" className="display mt-4 text-[clamp(1.9rem,4vw,3.2rem)]">
            {official?.kind === "incidents"
              ? "What the official record counts"
              : official?.kind === "warnings"
                ? "Official warnings in force"
                : `What is known about ${countryName}`}
          </h2>
          <p className="mt-4 max-w-[36rem] text-base leading-relaxed text-ink-secondary">
            {official?.kind === "incidents" &&
              `Incident reports filed to ${official.name}, the ${official.publisher}'s disaster portal. The only source here with verified casualty figures.`}
            {official?.kind === "warnings" &&
              `Issued by agencies publishing through ${official.name}. Warnings are forecasts and advisories, so they carry no casualty figures.`}
            {!official &&
              `This app is not connected to a national warning service for ${countryName}. The map shows what USGS, GDACS and NASA are tracking there. For warnings, follow your national weather and disaster agencies.`}
          </p>
          {official && (
            <a
              href={official.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink underline decoration-edge-strong underline-offset-4 hover:decoration-ink"
            >
              Open {official.name}
              <ArrowSquareOut size={13} aria-hidden />
            </a>
          )}
        </div>

        <div>
          {official?.kind === "incidents" &&
            (pending ? (
              <div className="h-40 animate-pulse rounded-3xl border border-edge bg-surface" role="status" aria-label="Loading figures" />
            ) : (
              <div className="space-y-4">
                <StatTiles totals={stats.totals} days={30} sourceName={official.name} />
                <CoverageNotice deathsInWindow={stats.totals.dead} sourceName={official.name} />
                <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-ink hover:underline">
                  Full incident log and charts <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            ))}

          {official?.kind === "warnings" && (
            <WarningList state={warnings} now={now} countryName={countryName} />
          )}

          {!official && <InternationalAlerts local={local} pending={pending} now={now} countryName={countryName} />}
        </div>
      </div>
    </section>
  );
}

function WarningList({
  state,
  now,
  countryName,
}: {
  state: ReturnType<typeof useWarnings>;
  now: number;
  countryName: string;
}) {
  if (state.status === "loading") {
    return <div className="h-40 animate-pulse rounded-3xl border border-edge bg-surface" role="status" aria-label="Loading warnings" />;
  }
  if (state.status === "failed") {
    return (
      <p className="rounded-3xl border border-dashed border-edge p-6 text-sm text-ink-secondary">
        The warning feed did not answer. This is not the same as no warnings: check the
        official site linked here.
      </p>
    );
  }
  if (state.warnings.length === 0) {
    return (
      <p className="rounded-3xl border border-edge p-6 text-sm text-ink-secondary">
        No warnings issued for {countryName} in the feed right now.
      </p>
    );
  }
  return (
    <div>
      <ul className="divide-y divide-edge overflow-hidden rounded-3xl border border-edge bg-surface">
        {state.warnings.slice(0, 6).map((warning) => (
          <li key={warning.id} className="p-4 sm:p-5">
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
      <p className="readout mt-3">
        {state.warnings.length} in the feed ·{" "}
        <Link href="/incidents" className="underline underline-offset-2 hover:text-ink">
          see all
        </Link>
      </p>
    </div>
  );
}

function InternationalAlerts({
  local,
  pending,
  now,
  countryName,
}: {
  local: DisasterEvent[];
  pending: boolean;
  now: number;
  countryName: string;
}) {
  if (pending) {
    return <div className="h-40 animate-pulse rounded-3xl border border-edge bg-surface" role="status" aria-label="Loading alerts" />;
  }
  const alerts = local
    .filter((event) => event.severity !== "good")
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 6);
  if (alerts.length === 0) {
    return (
      <p className="rounded-3xl border border-edge p-6 text-sm text-ink-secondary">
        None of the international monitors has raised anything above an advisory for{" "}
        {countryName} in the last 30 days.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-edge overflow-hidden rounded-3xl border border-edge bg-surface">
      {alerts.map((event) => (
        <li key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-4 sm:p-5">
          <SeverityBadge severity={event.severity} size="sm" />
          <p className="min-w-0 flex-1 text-sm text-ink">
            {event.title}
            <span className="text-ink-muted"> · {HAZARD_LABEL[event.kind]}</span>
          </p>
          <p className="readout whitespace-nowrap">{relativeTime(event.occurredAt, now)}</p>
        </li>
      ))}
    </ul>
  );
}
