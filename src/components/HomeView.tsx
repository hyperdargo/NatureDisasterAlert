"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Warning } from "@phosphor-icons/react/dist/ssr";
import { CoverageNotice } from "./CoverageNotice";
import { HazardMap } from "./HazardMap";
import { InstallCard } from "./InstallCard";
import { NearbyPanel, NotificationToggle, selectNearby } from "./NearbyPanel";
import { StatTiles } from "./StatTiles";
import { useLocation } from "./LocationProvider";
import { useLiveFeed, type FeedPayload } from "@/hooks/useLiveFeed";
import { useNow } from "@/hooks/useBrowserState";
import { useLocalAlerts } from "@/hooks/usePwa";
import { formatDistance } from "@/lib/geo";
import { relativeTime } from "@/lib/display";

/**
 * The home tab answers one question: is anything dangerous near me right now.
 *
 * Everything that is worth reading but not worth scrolling past in an
 * emergency now lives in its own tab. What stays here is the proximity list,
 * the headline figures with their caveat, and the map. The rest is one tap
 * away and linked at the bottom.
 */
const MORE = [
  {
    href: "/incidents",
    title: "Incident log and charts",
    description: "Every report, with daily trends and the worst-hit districts",
  },
  {
    href: "/news",
    title: "News",
    description: "Press coverage, and what is happening in other countries",
  },
  {
    href: "/roads",
    title: "Roads",
    description: "Highways with hazards reported nearby, before you travel",
  },
  {
    href: "/prepare",
    title: "What to do",
    description: "Actions for each hazard, ordered by what actually kills",
  },
] as const;

export function HomeView({
  initial,
  days,
  radiusKm,
  onRadiusChange,
}: {
  initial: FeedPayload;
  days: number;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
}) {
  const { data, refresh, refreshing, problem } = useLiveFeed(initial, days, true);
  const location = useLocation();
  const alerts = useLocalAlerts();
  const notifiedFor = useRef<Set<string>>(new Set());

  // Raise a notification the first time a serious hazard appears nearby.
  useEffect(() => {
    if (!alerts.enabled || !location.coords) return;
    const nearby = selectNearby(data.nepal, location.coords, radiusKm)
      .filter((hazard) => hazard.severity === "critical" || hazard.severity === "serious")
      .filter((hazard) => !notifiedFor.current.has(hazard.id));
    if (nearby.length === 0) return;

    for (const hazard of nearby) notifiedFor.current.add(hazard.id);
    void alerts.notify(
      nearby.slice(0, 3).map((hazard) => ({
        id: hazard.id,
        title: hazard.title,
        body: `${formatDistance(hazard.distanceKm)} · ${relativeTime(hazard.occurredAt, Date.now())}`,
        severity: hazard.severity,
      })),
    );
  }, [data.nepal, location.coords, radiusKm, alerts]);

  // Ticks each minute, seeded from the server clock so the first render
  // matches on both sides and relative stamps age on their own.
  const now = useNow(Date.parse(data.generatedAt));

  return (
    <div className="space-y-6 sm:space-y-8">
      {(data.degraded.length > 0 || problem !== "none") && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border px-4 py-2.5 text-xs"
          style={{
            borderColor: "var(--status-warning)",
            color: "var(--ink-secondary)",
            backgroundColor: "color-mix(in srgb, var(--status-warning) 8%, transparent)",
          }}
        >
          <Warning size={14} weight="fill" className="mt-px shrink-0 text-warning" aria-hidden />
          <span>
            {problem === "offline"
              ? "You are offline. These figures are from the last successful update and may be out of date."
              : problem === "unreachable"
                ? "Could not reach the server for the latest update, so these figures may be a few minutes old. Retrying automatically."
                : `Some sources did not respond this cycle (${data.degraded.join(", ")}). Coverage may be incomplete.`}
          </span>
        </p>
      )}

      <NearbyPanel
        events={data.nepal}
        status={location.status}
        coords={location.coords}
        message={location.message}
        hasAsked={location.hasAsked}
        resolvingConsent={location.resolvingConsent}
        radiusKm={radiusKm}
        onRadiusChange={onRadiusChange}
        onAllow={location.allow}
        onDecline={location.decline}
        now={now}
      />

      <div className="flex flex-wrap items-center gap-2">
        <NotificationToggle
          enabled={alerts.enabled}
          supported={alerts.supported}
          blocked={alerts.blocked}
          onEnable={() => void alerts.request()}
        />
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="ml-auto text-xs text-ink-muted transition-colors hover:text-ink-secondary disabled:opacity-60"
        >
          {refreshing ? "Refreshing" : `Updated ${relativeTime(data.generatedAt, now)}`}
        </button>
      </div>

      <InstallCard />

      {data.pending ? (
        <div
          className="h-28 animate-pulse rounded-lg border border-edge bg-surface"
          role="status"
          aria-label="Loading reported figures"
        />
      ) : (
        <>
          <StatTiles totals={data.stats.totals} days={days} />
          <CoverageNotice deathsInWindow={data.stats.totals.dead} />
        </>
      )}

      <section aria-label="Hazard map" className="h-[clamp(320px,48vh,520px)]">
        <HazardMap events={data.nepal} viewer={location.coords} />
      </section>

      <nav aria-label="More sections">
        <h2 className="mb-3 text-sm font-medium text-ink">More</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MORE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-16 items-center gap-3 rounded-lg border border-edge bg-surface px-4 py-3 transition-colors hover:border-edge-strong"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-ink-secondary">
                    {item.description}
                  </span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
