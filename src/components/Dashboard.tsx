"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DownloadSimple, Warning } from "@phosphor-icons/react/dist/ssr";
import { AreaAffected } from "./AreaAffected";
import { CasualtyTrend } from "./CasualtyTrend";
import { CoverageNotice } from "./CoverageNotice";
import { EmergencySheet } from "./EmergencySheet";
import { NewsFeed } from "./NewsFeed";
import { RoadAdvisory } from "./RoadAdvisory";
import { EventList } from "./EventList";
import { GlobalNews } from "./GlobalNews";
import { HazardBreakdown } from "./HazardBreakdown";
import { HazardMap } from "./HazardMap";
import { NearbyPanel, NotificationToggle, selectNearby } from "./NearbyPanel";
import { StatTiles } from "./StatTiles";
import { useNow } from "@/hooks/useBrowserState";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLocalAlerts, usePwa } from "@/hooks/usePwa";
import { formatDistance } from "@/lib/geo";
import { relativeTime } from "@/lib/display";
import type { Stats } from "@/lib/stats";
import type { DisasterEvent } from "@/lib/types";

const REFRESH_MS = 3 * 60 * 1000;

interface Payload {
  nepal: DisasterEvent[];
  global: DisasterEvent[];
  stats: Stats;
  degraded: string[];
  generatedAt: string;
}

export function Dashboard({
  initial,
  days,
}: {
  initial: Payload;
  days: number;
}) {
  const [data, setData] = useState(initial);
  const [radiusKm, setRadiusKm] = useState(50);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  // Ticks once a minute, seeded from the server's clock so the first render
  // matches on both sides. Relative stamps then age on their own.
  const now = useNow(Date.parse(initial.generatedAt));

  const location = useGeolocation();
  const alerts = useLocalAlerts();
  const pwa = usePwa();
  const notifiedFor = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        fetch(`/api/events?scope=global&days=${days}`, { cache: "no-store" }),
        fetch(`/api/stats?days=${days}`, { cache: "no-store" }),
      ]);
      if (!eventsRes.ok || !statsRes.ok) throw new Error("refresh failed");

      const eventsJson = (await eventsRes.json()) as {
        events: DisasterEvent[];
        degraded: string[];
        generatedAt: string;
      };
      const statsJson = (await statsRes.json()) as Stats;

      setData({
        nepal: eventsJson.events.filter((e) => e.inNepal),
        global: eventsJson.events.filter((e) => !e.inNepal),
        stats: statsJson,
        degraded: eventsJson.degraded,
        generatedAt: eventsJson.generatedAt,
      });
      setStale(eventsRes.headers.get("x-from-cache") === "1");
    } catch (error) {
      console.error(error);
      // Keep showing the last good data, but stop implying it is live.
      setStale(true);
    } finally {
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Raise a notification the first time a serious hazard appears nearby.
  useEffect(() => {
    if (!alerts.enabled || !location.coords) return;
    const nearby = selectNearby(data.nepal, location.coords, radiusKm)
      .filter((h) => h.severity === "critical" || h.severity === "serious")
      .filter((h) => !notifiedFor.current.has(h.id));
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

  return (
    // Bottom padding keeps the last row clear of the floating emergency button.
    <div className="space-y-6 pb-24 sm:space-y-8">
      {(data.degraded.length > 0 || stale) && (
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
            {stale
              ? "You are offline. These figures are from the last successful update and may be out of date."
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
        onRadiusChange={setRadiusKm}
        onAllow={location.allow}
        onDecline={location.decline}
        now={now}
      />

      <div className="flex flex-wrap items-center gap-2">
        {location.status === "granted" && (
          <NotificationToggle
            enabled={alerts.enabled}
            supported={alerts.supported}
            onEnable={() => void alerts.request()}
          />
        )}
        {pwa.canInstall && (
          <button
            type="button"
            onClick={() => void pwa.install()}
            className="inline-flex items-center gap-1.5 rounded border border-edge px-2.5 py-1 text-xs text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink"
          >
            <DownloadSimple size={13} aria-hidden />
            Add to home screen
          </button>
        )}
        {pwa.iosInstructions && !pwa.canInstall && (
          <p className="text-xs text-ink-muted">
            To install: tap Share, then Add to Home Screen.
          </p>
        )}
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="ml-auto text-xs text-ink-muted transition-colors hover:text-ink-secondary disabled:opacity-60"
        >
          {refreshing ? "Refreshing" : `Updated ${relativeTime(data.generatedAt, now)}`}
        </button>
      </div>

      <StatTiles totals={data.stats.totals} days={days} />

      <CoverageNotice deathsInWindow={data.stats.totals.dead} />

      {/* Directly under the figures, because national tolls reported by the
          press are the context those figures need. */}
      <NewsFeed now={now} />

      <section aria-label="Hazard map" className="h-[clamp(340px,52vh,560px)]">
        <HazardMap events={data.nepal} viewer={location.coords} />
      </section>

      {/* Three questions: when it happened, what it was, and where. */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-edge bg-surface p-4 sm:p-5">
          <CasualtyTrend series={data.stats.series} />
        </div>
        <div className="rounded-lg border border-edge bg-surface p-4 sm:p-5">
          <HazardBreakdown hazards={data.stats.byHazard} />
        </div>
        <div className="rounded-lg border border-edge bg-surface p-4 sm:p-5 md:col-span-2 xl:col-span-1">
          <AreaAffected districts={data.stats.byDistrict} />
        </div>
      </div>

      <RoadAdvisory days={days} />

      <EventList events={data.nepal} now={now} />

      <GlobalNews events={data.global} now={now} />

      {/* Always reachable, whatever is on screen. */}
      <EmergencySheet coords={location.coords} />
    </div>
  );
}
