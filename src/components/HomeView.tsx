"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Warning } from "@phosphor-icons/react/dist/ssr";
import { useCountry } from "./CountryProvider";
import { InstallCard } from "./InstallCard";
import { useLocation } from "./LocationProvider";
import { GuideGallery } from "./home/GuideGallery";
import { HowItWorks } from "./home/HowItWorks";
import { MapSection } from "./home/MapSection";
import { OfficialSection } from "./home/OfficialSection";
import { StatusStage } from "./home/StatusStage";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useNow } from "@/hooks/useBrowserState";
import { useLocalAlerts } from "@/hooks/usePwa";
import { headlineNumber, numbersFor } from "@/lib/countries/emergency";
import { profileFor } from "@/lib/countries/profiles";
import { formatDistance } from "@/lib/geo";
import { relativeTime } from "@/lib/display";
import { selectNearby, splitByRecency } from "@/lib/nearby";
import type { HazardKind } from "@/lib/types";

/**
 * The home screen, top to bottom:
 *
 *   status     Am I in danger, and who do I call. The signature: a globe that
 *              dives onto the country as you scroll.           (pinned dive)
 *   map        Everything in the country.                      (no motion)
 *   official   What the national record or warning service says. (stillness)
 *   guides     What to do, one hazard at a time.  (pinned horizontal gallery)
 *   how        How the data reaches the phone, and what never leaves it.
 *                                                    (line drawn by scroll)
 *   more       The other tabs.                                  (stillness)
 *
 * Every mechanism appears once. The top of the page answers the emergency
 * question before any of the motion has anything to do with it.
 */
export function HomeView({ days }: { days: number }) {
  const { data, refresh, refreshing, problem, lastError } = useLiveFeed(days, true);
  const location = useLocation();
  const country = useCountry();
  const alerts = useLocalAlerts();
  const [radiusKm, setRadiusKm] = useState(50);
  const notifiedFor = useRef<Set<string>>(new Set());

  const allEvents = useMemo(() => [...data.local, ...data.elsewhere], [data.local, data.elsewhere]);
  const now = useNow(Date.parse(data.generatedAt));
  const { recent: nearby, olderCount } = useMemo(
    () =>
      splitByRecency(
        location.coords ? selectNearby(allEvents, location.coords, radiusKm) : [],
        now,
      ),
    [allEvents, location.coords, radiusKm, now],
  );

  // Raise a notification the first time a serious hazard appears nearby.
  useEffect(() => {
    if (!alerts.enabled || !location.coords) return;
    const fresh = nearby
      .filter((hazard) => hazard.severity === "critical" || hazard.severity === "serious")
      .filter((hazard) => !notifiedFor.current.has(hazard.id));
    if (fresh.length === 0) return;
    for (const hazard of fresh) notifiedFor.current.add(hazard.id);
    void alerts.notify(
      fresh.slice(0, 3).map((hazard) => ({
        id: hazard.id,
        title: hazard.title,
        body: `${formatDistance(hazard.distanceKm)} · ${relativeTime(hazard.occurredAt, Date.now())}`,
        severity: hazard.severity,
      })),
    );
  }, [nearby, location.coords, alerts]);

  const activeKinds = useMemo(
    () => [...new Set(data.local.map((event) => event.kind))] as HazardKind[],
    [data.local],
  );
  const headline = headlineNumber(numbersFor(country.code));
  const profile = country.code ? profileFor(country.code) : null;
  const countryName = country.info?.name ?? null;

  const more = [
    { href: "/incidents", title: "Incident log", note: "Every report, with trends" },
    { href: "/news", title: "News", note: "Press coverage and the world" },
    ...(profile?.roads ? [{ href: "/roads", title: "Roads", note: "Highways with hazards nearby" }] : []),
    { href: "/prepare", title: "Prepare", note: "Guides and a kit list" },
    { href: "/faq", title: "Questions", note: "Where the data comes from" },
  ];

  return (
    <>
      <StatusStage
        events={allEvents}
        nearby={nearby}
        olderCount={olderCount}
        location={location}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        pending={data.pending}
        problem={problem}
        lastError={lastError}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        generatedAt={data.generatedAt}
        now={now}
        alerts={alerts}
        trackedInCountry={data.local.length}
      />

      {(data.degraded.length > 0 || (problem !== "none" && !data.pending)) && (
        <div className="mx-auto w-full max-w-[1400px] px-[var(--gutter)] pt-6">
          <p
            role="status"
            className="flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm text-ink-secondary"
            style={{
              borderColor: "var(--status-warning)",
              backgroundColor: "color-mix(in srgb, var(--status-warning) 7%, transparent)",
            }}
          >
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <span>
              {problem === "offline"
                ? "You are offline. These figures are from the last successful update and may be out of date."
                : problem === "unreachable"
                  ? "Could not reach the server for the latest update, so this may be a few minutes old. Retrying automatically."
                  : `Some sources did not respond this cycle (${data.degraded.join(", ")}). Coverage may be incomplete.`}
            </span>
          </p>
        </div>
      )}

      <MapSection
        events={allEvents}
        viewer={location.coords}
        country={country.code}
        countryName={countryName}
        localCount={data.local.length}
        pending={data.pending}
      />

      <OfficialSection
        country={country.code}
        countryName={countryName}
        stats={data.stats}
        local={data.local}
        pending={data.pending}
        now={now}
      />

      <GuideGallery activeKinds={activeKinds} countryName={countryName} number={headline?.number ?? null} />

      <HowItWorks officialName={profile?.official?.name ?? null} />

      <nav aria-label="More sections" className="mx-auto w-full max-w-[1400px] px-[var(--gutter)] pt-28">
        <div className="mb-10">
          <InstallCard />
        </div>
        <ul className="border-t border-edge">
          {more.map((item) => (
            <li key={item.href} className="border-b border-edge">
              <Link
                href={item.href}
                className="group flex min-h-20 items-center gap-6 py-4 transition-colors hover:text-ice"
              >
                <span className="display flex-1 text-[clamp(1.7rem,4.5vw,3.4rem)]">{item.title}</span>
                <span className="readout hidden sm:block">{item.note}</span>
                <ArrowUpRight
                  size={28}
                  className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
