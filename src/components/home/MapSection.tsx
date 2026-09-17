"use client";

import { HazardMap } from "../HazardMap";
import { SEVERITY_STYLE } from "@/lib/display";
import { mapViewFor } from "@/lib/countries";
import type { Coords } from "@/hooks/useGeolocation";
import type { DisasterEvent, Severity } from "@/lib/types";

const LEGEND: Severity[] = ["critical", "serious", "warning", "good"];

/**
 * The map. No scroll effects of any kind: a map is something people pan and
 * pinch, and binding it to page scroll would fight their fingers.
 */
export function MapSection({
  events,
  viewer,
  country,
  countryName,
  localCount,
  pending,
}: {
  events: DisasterEvent[];
  viewer: Coords | null;
  country: string | null;
  countryName: string | null;
  localCount: number;
  pending: boolean;
}) {
  return (
    <section
      aria-labelledby="map-heading"
      className="after-dive relative z-10 mx-auto w-full max-w-[1400px] px-[var(--gutter)] pt-16 md:pt-8"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="map-heading" className="display text-[clamp(1.9rem,4vw,3.2rem)]">
            {countryName ? `Everything in ${countryName}` : "Everything, everywhere"}
          </h2>
          <p className="readout mt-3">
            {!country
              ? "Choose a country to load its reports"
              : pending
                ? "Loading reports"
              : `${localCount} ${localCount === 1 ? "event" : "events"} in the last 30 days · tap a mark for details`}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Severity key">
          {LEGEND.map((level) => (
            <li key={level} className="readout flex items-center gap-1.5 text-ink-secondary">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: SEVERITY_STYLE[level].token, boxShadow: `0 0 10px ${SEVERITY_STYLE[level].hex}` }}
              />
              {SEVERITY_STYLE[level].label}
            </li>
          ))}
        </ul>
      </div>
      <div className="h-[clamp(420px,72vh,780px)]">
        <HazardMap events={events} viewer={viewer} view={mapViewFor(country ?? "")} />
      </div>
    </section>
  );
}
