"use client";

import { useMemo, useRef } from "react";
import { ArrowDown, Crosshair, Phone } from "@phosphor-icons/react/dist/ssr";
import { Globe, type GlobePoint } from "../Globe";
import { NotificationToggle } from "../NotificationToggle";
import { SeverityBadge } from "../SeverityBadge";
import { useCountry } from "../CountryProvider";
import type { useLocation } from "../LocationProvider";
import { REDUCED_MOTION, smoothstep, useMediaQuery, useScrollProgress } from "@/hooks/useScroll";
import { countryName as nameOf } from "@/lib/countries";
import { headlineNumber, numbersFor } from "@/lib/countries/emergency";
import { SEVERITY_STYLE, relativeTime } from "@/lib/display";
import { formatDistance } from "@/lib/geo";
import { RADII, RECENT_DAYS, type NearbyHazard } from "@/lib/nearby";
import type { DisasterEvent } from "@/lib/types";

type Location = ReturnType<typeof useLocation>;

type Status =
  | "detecting"
  | "ask"
  | "locating"
  | "no-location"
  | "checking"
  | "unknown"
  | "clear"
  | "hazards";

const SOURCE_NOTE = {
  chosen: "Chosen by you",
  location: "From your location",
  timezone: "Guessed from your time zone",
} as const;

export function openEmergencySheet() {
  window.dispatchEvent(new Event("nda:open-emergency"));
}

/**
 * The first screen, and the signature moment.
 *
 * The HTML column answers "am I in danger, and who do I call" the instant the
 * page is interactive. The globe beside it is the atmosphere around that
 * answer. On wide screens the stage is pinned while the column scrolls away,
 * then the globe dives onto the country and the country's name widens into
 * place, handing over to the real map below. Phones and reduced motion get a
 * still globe and no pin.
 */
export function StatusStage({
  events,
  nearby,
  olderCount,
  location,
  radiusKm,
  onRadiusChange,
  pending,
  problem,
  lastError,
  refreshing,
  onRefresh,
  generatedAt,
  now,
  alerts,
  trackedInCountry,
}: {
  events: DisasterEvent[];
  /** Within the radius and within RECENT_DAYS. */
  nearby: NearbyHazard[];
  /** Within the radius but older, still in the 30-day window. */
  olderCount: number;
  location: Location;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  pending: boolean;
  problem: "none" | "offline" | "unreachable";
  lastError: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  generatedAt: string;
  now: number;
  alerts: { enabled: boolean; supported: boolean; blocked: boolean; request: () => Promise<void> };
  trackedInCountry: number;
}) {
  const country = useCountry();
  const stage = useRef<HTMLElement>(null);
  const dive = useRef(0);
  const nameRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLParagraphElement>(null);
  const cueRef = useRef<HTMLParagraphElement>(null);

  const reduced = useMediaQuery(REDUCED_MOTION);
  const wide = useMediaQuery("(min-width: 768px) and (min-height: 600px)");
  const cinematic = wide && !reduced;

  useScrollProgress(stage, (progress) => {
    dive.current = cinematic ? progress : 0;
    // The country name widens as the globe reaches the ground. Opacity is an
    // explicit function of progress so it can never stick half-visible.
    const name = nameRef.current;
    if (name) {
      const t = cinematic ? smoothstep(0.55, 0.95, progress) : 0;
      name.style.opacity = String(t);
      name.style.transform = `translateY(${(1 - t) * 24}px)`;
      if (nameTextRef.current) {
        nameTextRef.current.style.fontVariationSettings = `"wdth" ${75 + 50 * t}, "wght" ${500 + 250 * t}`;
      }
    }
    if (cueRef.current) {
      cueRef.current.style.opacity = String(cinematic ? 1 - smoothstep(0.02, 0.12, progress) : 1);
    }
  });

  const points = useMemo<GlobePoint[]>(
    () =>
      events.map((event) => ({
        id: event.id,
        lat: event.lat,
        lon: event.lon,
        severity: event.severity,
      })),
    [events],
  );

  const numbers = numbersFor(country.code);
  const headline = headlineNumber(numbers);
  const countryName = country.info?.name ?? null;

  const status: Status = !country.code
    ? "detecting"
    : location.status !== "granted" || !location.coords
      ? location.status === "prompting"
        ? "locating"
        : !location.resolvingConsent && !location.hasAsked
          ? "ask"
          : "no-location"
      : pending
        ? "checking"
        : nearby.length === 0 && problem !== "none"
          ? "unknown"
          : nearby.length === 0
            ? "clear"
            : "hazards";

  const gravest = nearby[0];

  return (
    <section ref={stage} aria-labelledby="status-heading" className="dive-stage relative">
      {/* The pinned stage: globe and the country name it lands on. */}
      <div className="dive-pin relative overflow-hidden">
        <div className="absolute inset-0">
          <Globe
            country={country.code}
            points={points}
            viewer={location.coords}
            dive={dive}
            animate={cinematic}
            anchor={wide ? { x: 0.7, y: 0.52, radius: 0.36 } : { x: 0.5, y: 0.55, radius: 0.42 }}
            label={
              countryName
                ? `Globe centred on ${countryName}, showing ${events.length} hazards the feeds are tracking`
                : `Globe showing ${events.length} hazards the feeds are tracking`
            }
          />
        </div>
        {/* Fades the globe into the page edge so text on top stays legible. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 70% 50%, transparent 40%, var(--page) 100%), linear-gradient(to bottom, transparent 70%, var(--page))",
          }}
        />
        {cinematic && countryName && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-[var(--gutter)] text-center">
            <div ref={nameRef} style={{ opacity: 0 }}>
              <p ref={nameTextRef} className="display text-[clamp(3rem,11vw,10rem)] text-ink" style={{ fontStretch: "normal" }}>
                {countryName}
              </p>
              <p className="readout mt-4">
                {trackedInCountry} {trackedInCountry === 1 ? "event" : "events"} tracked in the last 30 days · the map is next
              </p>
            </div>
          </div>
        )}
      </div>

      {/* The answer. Scrolls normally over the pinned stage. */}
      <div className="dive-content relative z-10 mx-auto w-full max-w-[1400px] px-[var(--gutter)]">
        {/* Top-aligned, not centred: the answer changes length once the
            country and location resolve, and a centred column would jump. */}
        <div className="dive-column flex max-w-[40rem] flex-col pt-4 pb-10 md:pt-[max(7.5rem,16vh)] md:pb-16">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="readout flex items-center gap-2 text-ink-secondary">
              <span className="live-dot" aria-hidden />
              Live
              {countryName && (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-ink">{countryName}</span>
                </>
              )}
              {!pending && (
                <>
                  <span aria-hidden>·</span>
                  <span>Updated {relativeTime(generatedAt, now)}</span>
                </>
              )}
            </span>
            {country.code && (
              <button
                type="button"
                onClick={country.openPicker}
                className="readout rounded-full border border-edge px-2.5 py-1 text-ink-secondary hover:border-edge-strong hover:text-ink"
              >
                {country.source ? SOURCE_NOTE[country.source] : "Set"} · change
              </button>
            )}
          </div>

          {country.suggestion && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-edge-strong bg-raised px-4 py-3 text-sm">
              <span className="min-w-0 flex-1">
                You appear to be in{" "}
                <strong className="font-semibold">{nameOf(country.suggestion)}</strong>.
                Switch so the emergency numbers match?
              </span>
              <button
                type="button"
                onClick={() => country.choose(country.suggestion!)}
                className="press rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-page"
              >
                Switch
              </button>
              <button
                type="button"
                onClick={country.dismissSuggestion}
                className="rounded-full px-3 py-1.5 text-sm text-ink-secondary hover:text-ink"
              >
                Keep
              </button>
            </div>
          )}

          <h1
            id="status-heading"
            aria-live="polite"
            className="display mt-6 text-[clamp(2.6rem,6.4vw,5.6rem)] text-ink"
          >
            <StatusHeadline status={status} count={nearby.length} radiusKm={radiusKm} gravest={gravest} />
          </h1>

          <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-ink-secondary sm:text-lg">
            <StatusDetail
              status={status}
              radiusKm={radiusKm}
              countryName={countryName}
              olderCount={olderCount}
              message={location.message}
              lastError={pending ? lastError : null}
            />
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {headline ? (
              <a
                href={`tel:${headline.number}`}
                className="press inline-flex min-h-14 items-center gap-3 rounded-full bg-alarm py-2 pr-6 pl-2 text-white"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
                  <Phone size={20} weight="fill" aria-hidden />
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-lg font-semibold tabular">Call {headline.number}</span>
                  <span className="block text-xs text-white/85">{headline.label}</span>
                </span>
              </a>
            ) : (
              country.code && (
                <button
                  type="button"
                  onClick={openEmergencySheet}
                  className="press inline-flex min-h-14 items-center gap-3 rounded-full bg-alarm px-6 text-base font-semibold text-white"
                >
                  <Phone size={20} weight="fill" aria-hidden />
                  Emergency help
                </button>
              )
            )}

            {status === "detecting" && (
              <button
                type="button"
                onClick={country.openPicker}
                className="press inline-flex min-h-14 items-center gap-2 rounded-full bg-ink px-6 text-base font-semibold text-page"
              >
                Choose your country
              </button>
            )}
            {status === "detecting" && (
              <button
                type="button"
                onClick={openEmergencySheet}
                className="press inline-flex min-h-14 items-center gap-2 rounded-full border border-edge-strong px-6 text-base font-medium text-ink"
              >
                <Phone size={18} weight="fill" aria-hidden />
                Emergency help
              </button>
            )}

            {(status === "ask" || status === "no-location") && (
              <button
                type="button"
                onClick={location.allow}
                className="press inline-flex min-h-14 items-center gap-2 rounded-full border border-edge-strong px-6 text-base font-medium text-ink hover:bg-raised"
              >
                <Crosshair size={18} aria-hidden />
                Check near me
              </button>
            )}
            {status === "ask" && (
              <button
                type="button"
                onClick={location.decline}
                className="min-h-14 px-3 text-sm text-ink-secondary hover:text-ink"
              >
                Not now
              </button>
            )}
          </div>

          {(status === "ask" || status === "no-location") && (
            <p className="mt-4 max-w-[32rem] text-xs leading-relaxed text-ink-muted">
              Distances are worked out on your phone. The server is never told where
              you are, except the nearby-hospital search, which sends a position
              rounded to about 1 km.
            </p>
          )}

          {location.coords && (
            <div className="mt-10 border-t border-edge pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1" role="group" aria-label="Search radius">
                  {RADII.map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => onRadiusChange(km)}
                      aria-pressed={km === radiusKm}
                      className={`readout min-h-9 rounded-full border px-3 ${
                        km === radiusKm
                          ? "border-edge-strong text-ink"
                          : "border-transparent hover:text-ink-secondary"
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <NotificationToggle
                    enabled={alerts.enabled}
                    supported={alerts.supported}
                    blocked={alerts.blocked}
                    onEnable={() => void alerts.request()}
                  />
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="readout min-h-9 rounded-full border border-edge px-3 hover:text-ink disabled:opacity-60"
                  >
                    {refreshing ? "Refreshing" : pending ? "Retry" : "Refresh"}
                  </button>
                </div>
              </div>

              {nearby.length > 0 && (
                <ul className="mt-4 divide-y divide-edge">
                  {nearby.slice(0, 4).map((hazard) => (
                    <li key={hazard.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                      <SeverityBadge severity={hazard.severity} size="sm" />
                      <p className="min-w-0 flex-1 text-sm text-ink">
                        {hazard.title}
                        {hazard.place && <span className="text-ink-secondary"> · {hazard.place}</span>}
                      </p>
                      <p className="readout tabular whitespace-nowrap text-ink-secondary">
                        {formatDistance(hazard.distanceKm)} · {relativeTime(hazard.occurredAt, now)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {(nearby.length > 4 || (olderCount > 0 && nearby.length > 0)) && (
                <p className="mt-1 text-xs text-ink-muted">
                  {[
                    nearby.length > 4 ? `${nearby.length - 4} more this week` : null,
                    olderCount > 0 ? `${olderCount} older this month` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  , all on the map below.
                </p>
              )}
            </div>
          )}

          <p ref={cueRef} className="readout mt-12 hidden items-center gap-2 md:flex">
            <ArrowDown size={12} aria-hidden /> Scroll to the map
          </p>
        </div>
      </div>
    </section>
  );
}

function StatusHeadline({
  status,
  count,
  radiusKm,
  gravest,
}: {
  status: Status;
  count: number;
  radiusKm: number;
  gravest: NearbyHazard | undefined;
}) {
  switch (status) {
    case "detecting":
    case "ask":
    case "no-location":
      return <>Is anything dangerous near you?</>;
    case "locating":
      return <>Finding where you are.</>;
    case "checking":
      return <>Checking {radiusKm} km around you.</>;
    case "unknown":
      return <span style={{ color: "var(--status-warning)" }}>Can&rsquo;t check right now.</span>;
    case "clear":
      return <>Nothing new within {radiusKm} km this week.</>;
    case "hazards":
      return (
        <>
          <span style={{ color: gravest ? SEVERITY_STYLE[gravest.severity].token : undefined }}>
            {count} {count === 1 ? "hazard" : "hazards"}
          </span>{" "}
          within {radiusKm} km this week.
        </>
      );
  }
}

function StatusDetail({
  status,
  radiusKm,
  countryName,
  olderCount,
  message,
  lastError,
}: {
  status: Status;
  radiusKm: number;
  countryName: string | null;
  olderCount: number;
  message: string | null;
  lastError: string | null;
}) {
  const where = countryName ?? "your country";
  switch (status) {
    case "detecting":
      return (
        <>
          Live floods, earthquakes, storms and fires, with the emergency numbers for wherever you
          are. Your device did not say which country that is, so choose it once and it is
          remembered.
        </>
      );
    case "ask":
      return (
        <>
          Share your location and this page lists the hazards within {radiusKm} km, with real
          distances. Everything in {where} is on the map below either way.
        </>
      );
    case "no-location":
      return (
        <>
          {message ?? "Location is off."} The map below still shows everything reported in {where}.
        </>
      );
    case "locating":
      return <>Allow the browser prompt to continue.</>;
    case "checking":
      return (
        <>
          Loading the latest reports.
          {lastError && <span className="mt-1 block text-sm text-ink-muted">{lastError}</span>}
        </>
      );
    case "unknown":
      return (
        <>
          The latest reports did not load, so this is not an all-clear. Retrying on its own.
        </>
      );
    case "clear":
      return (
        <>
          No flood, landslide, quake, storm or fire reported near you in the last {RECENT_DAYS} days.
          {olderCount > 0 &&
            ` ${olderCount} older ${olderCount === 1 ? "report" : "reports"} from this month ${olderCount === 1 ? "is" : "are"} on the map.`}{" "}
          This checks again every few minutes while the page is open.
        </>
      );
    case "hazards":
      return <>Gravest first, then closest. Tap Call if anyone is in danger now.</>;
  }
}
