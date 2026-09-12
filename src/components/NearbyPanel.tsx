"use client";

import { useMemo } from "react";
import {
  BellRinging,
  BellSlash,
  CheckCircle,
  Crosshair,
  MapPin,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { SeverityBadge } from "./SeverityBadge";
import { formatDistance, haversineKm } from "@/lib/geo";
import { PROXIMITY_RELEVANT, SEVERITY_STYLE, relativeTime } from "@/lib/display";
import type { Coords, LocationStatus } from "@/hooks/useGeolocation";
import type { DisasterEvent } from "@/lib/types";

export interface NearbyHazard extends DisasterEvent {
  distanceKm: number;
}

/**
 * Rank what is near the viewer: gravest first, then closest.
 *
 * Only hazards a person can act on by proximity are included. A snakebite
 * logged 12 km away is a real incident but not an approaching threat, and
 * padding this list with them would train people to ignore it.
 */
export function selectNearby(
  events: DisasterEvent[],
  viewer: Coords,
  radiusKm: number,
): NearbyHazard[] {
  return events
    .filter((event) => PROXIMITY_RELEVANT.has(event.kind))
    .map((event) => ({
      ...event,
      distanceKm: haversineKm(viewer.lat, viewer.lon, event.lat, event.lon),
    }))
    .filter((event) => event.distanceKm <= radiusKm)
    .sort(
      (a, b) =>
        SEVERITY_STYLE[b.severity].rank - SEVERITY_STYLE[a.severity].rank ||
        a.distanceKm - b.distanceKm,
    );
}

const RADII = [25, 50, 100] as const;

export function NearbyPanel({
  events,
  status,
  coords,
  message,
  hasAsked,
  resolvingConsent,
  radiusKm,
  onRadiusChange,
  onAllow,
  onDecline,
  now,
}: {
  events: DisasterEvent[];
  status: LocationStatus;
  coords: Coords | null;
  message: string | null;
  hasAsked: boolean;
  resolvingConsent: boolean;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onAllow: () => void;
  onDecline: () => void;
  now: number;
}) {
  const nearby = useMemo(
    () => (coords ? selectNearby(events, coords, radiusKm) : []),
    [events, coords, radiusKm],
  );

  // First visit: explain before asking, so the browser prompt is expected.
  if (!resolvingConsent && !hasAsked && status !== "granted") {
    return (
      <section className="rounded-lg border border-edge bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Crosshair size={22} weight="duotone" className="mt-0.5 shrink-0 text-ink" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-base font-medium text-ink">Check hazards in your area</h2>
            <p className="mt-1.5 max-w-prose text-sm text-ink-secondary">
              Share your location and this page will tell you which floods,
              landslides and earthquakes are happening near you, and how far away
              they are.
            </p>

            <p className="mt-3 flex items-start gap-2 text-xs text-ink-secondary">
              <ShieldCheck size={15} weight="fill" className="mt-px shrink-0 text-good" aria-hidden />
              <span>
                Distances are worked out on your device, so the server is never
                told where you are. There is no account to sign into. The one
                exception is the nearby hospitals search, which sends a
                position rounded to about 1 km.
              </span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onAllow}
                className="rounded border border-transparent bg-ink px-3.5 py-2 text-sm font-medium text-page transition-transform active:translate-y-px"
              >
                Use my location
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="rounded border border-edge px-3.5 py-2 text-sm text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (status === "prompting") {
    return (
      <section className="rounded-lg border border-edge bg-surface p-5">
        <p className="flex items-center gap-2 text-sm text-ink-secondary">
          <Crosshair size={16} className="animate-pulse" aria-hidden />
          Waiting for your location. Allow the browser prompt to continue.
        </p>
      </section>
    );
  }

  if (status !== "granted" || !coords) {
    return (
      <section className="rounded-lg border border-edge bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Showing all of Nepal</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-secondary">
          {message ?? "Location is off."} Turn it on to see which hazards are
          closest to you.
        </p>
        <button
          type="button"
          onClick={onAllow}
          className="mt-3 rounded border border-edge px-3 py-1.5 text-sm text-ink transition-colors hover:border-edge-strong"
        >
          Use my location
        </button>
      </section>
    );
  }

  const gravest = nearby[0];
  const clear = nearby.length === 0;

  return (
    <section
      className="overflow-hidden rounded-lg border bg-surface"
      style={{
        // The panel border carries the gravest nearby level, so the status is
        // legible before a single word is read.
        borderColor: clear ? "var(--border)" : SEVERITY_STYLE[gravest.severity].token,
      }}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-2.5">
        <h2 className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <MapPin size={13} weight="fill" aria-hidden />
          Within {radiusKm} km of you
        </h2>
        <div className="flex items-center gap-1" role="group" aria-label="Search radius">
          {RADII.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => onRadiusChange(km)}
              aria-pressed={km === radiusKm}
              className={`rounded border px-2 py-0.5 text-[11px] tabular transition-colors ${
                km === radiusKm
                  ? "border-edge-strong text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      {clear ? (
        <div className="flex items-start gap-3 p-5">
          <CheckCircle size={22} weight="fill" className="mt-px shrink-0 text-good" aria-hidden />
          <div>
            <p className="text-base font-medium text-ink">No active hazards near you</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Nothing has been reported within {radiusKm} km recently. This page
              refreshes on its own.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-edge">
          {nearby.slice(0, 6).map((hazard) => (
            <li key={hazard.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-4">
              <SeverityBadge severity={hazard.severity} size="sm" />
              <p className="min-w-0 flex-1 text-sm text-ink">
                {hazard.title}
                {hazard.place ? (
                  <span className="text-ink-secondary"> · {hazard.place}</span>
                ) : null}
              </p>
              <p className="tabular text-xs whitespace-nowrap text-ink-secondary">
                {formatDistance(hazard.distanceKm)}
              </p>
              <p className="text-xs whitespace-nowrap text-ink-muted">
                {relativeTime(hazard.occurredAt, now)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {nearby.length > 6 && (
        <p className="border-t border-edge px-4 py-2 text-xs text-ink-secondary">
          {nearby.length - 6} more within {radiusKm} km, shown on the map.
        </p>
      )}
    </section>
  );
}

/**
 * The alert toggle.
 *
 * Every state says something. Previously a refused permission left the button
 * showing its original label and doing nothing when tapped, because Android
 * will not present the system dialog a second time. That reads as a broken
 * button, which is worse than an honest "blocked".
 */
export function NotificationToggle({
  enabled,
  supported,
  blocked,
  onEnable,
}: {
  enabled: boolean;
  supported: boolean;
  blocked: boolean;
  onEnable: () => void;
}) {
  if (!supported) return null;

  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-edge px-2.5 py-1 text-xs text-ink-muted">
        <BellSlash size={13} aria-hidden />
        Alerts blocked. Turn notifications on for this app in your device
        settings.
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onEnable}
      disabled={enabled}
      className="inline-flex min-h-9 items-center gap-1.5 rounded border border-edge px-2.5 py-1 text-xs text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink disabled:cursor-default disabled:opacity-60"
    >
      <BellRinging size={13} weight={enabled ? "fill" : "regular"} aria-hidden />
      {enabled ? "Alerts on" : "Alert me when something is near"}
    </button>
  );
}
