"use client";

import { useEffect, useState } from "react";
import { Path, Phone, Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * Roads to check before travelling.
 *
 * The wording here is load-bearing. This panel reports that a landslide or
 * flood was logged near a road; it never reports that a road is closed or
 * open, because no source available to this app knows that. Everything on
 * screen is phrased to send the reader to Traffic Police for the real answer
 * rather than to imply the page has already checked.
 */
interface Advisory {
  roads: Array<{ name: string; ref: string | null; classification: string }>;
  districts: string[];
  reportedDamage: Array<{
    id: string;
    title: string;
    area: string | null;
    roads: number;
    bridges: number;
  }>;
  incidentsConsidered: number;
  unavailable?: boolean;
}

export function RoadAdvisory({ days }: { days: number }) {
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/roads?days=${days}`);
        const data = (await response.json()) as Advisory;
        if (!cancelled) setAdvisory(data);
      } catch (error) {
        console.error("road advisory failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const hasRoads = (advisory?.roads.length ?? 0) > 0;
  const hasDamage = (advisory?.reportedDamage.length ?? 0) > 0;

  return (
    <section aria-labelledby="roads-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="roads-heading"
          className="flex items-center gap-1.5 text-sm font-medium text-ink"
        >
          <Path size={15} weight="duotone" aria-hidden />
          Roads to check before travelling
        </h2>
        <p className="text-xs text-ink-secondary">Last {days} days</p>
      </div>

      <div className="rounded-lg border border-edge bg-surface">
        {/* The disclaimer sits above the data, not buried under it. */}
        <div
          className="flex items-start gap-2 border-b border-edge px-4 py-3"
          style={{
            backgroundColor: "color-mix(in srgb, var(--status-warning) 8%, transparent)",
          }}
        >
          <Warning
            size={15}
            weight="fill"
            className="mt-px shrink-0 text-warning"
            aria-hidden
          />
          <p className="text-xs leading-relaxed text-ink-secondary">
            <strong className="font-medium text-ink">
              This is not a closure list.
            </strong>{" "}
            No public feed publishes live road status for Nepal. These are roads
            with a landslide or flood reported nearby, which may or may not be
            passable. Confirm with Traffic Police before you travel.
          </p>
        </div>

        <div className="p-4">
          {loading && <p className="text-sm text-ink-secondary">Checking roads</p>}

          {!loading && hasDamage && (
            <>
              <h3 className="text-xs font-medium text-ink">
                Road or bridge damage reported
              </h3>
              <ul className="mt-2 space-y-1.5">
                {advisory?.reportedDamage.map((item) => (
                  <li key={item.id} className="text-xs text-ink-secondary">
                    <span className="text-ink">{item.title}</span>
                    {item.area ? ` · ${item.area}` : ""}
                    {" · "}
                    <span className="tabular" style={{ color: "var(--status-critical)" }}>
                      {[
                        item.roads > 0 ? `${item.roads} road` : null,
                        item.bridges > 0 ? `${item.bridges} bridge` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}{" "}
                      affected
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!loading && hasRoads && (
            <>
              <h3 className={`text-xs font-medium text-ink ${hasDamage ? "mt-4" : ""}`}>
                Landslides or floods reported near these roads
              </h3>
              {advisory!.districts.length > 0 && (
                <p className="mt-1 text-[11px] text-ink-muted">
                  In {advisory!.districts.slice(0, 6).join(", ")}
                </p>
              )}
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {advisory!.roads.map((road) => (
                  <li
                    key={road.name}
                    className="rounded border border-edge px-2 py-1 text-xs text-ink-secondary"
                  >
                    {road.ref && (
                      <span className="tabular mr-1.5 font-medium text-ink">{road.ref}</span>
                    )}
                    {road.name}
                    <span className="ml-1.5 text-ink-muted">{road.classification}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!loading && !hasRoads && !hasDamage && (
            <p className="text-sm text-ink-secondary">
              No landslides or floods were reported near a mapped highway in this
              period.
            </p>
          )}

          <a
            href="tel:103"
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-edge-strong text-sm font-medium text-ink transition-transform active:translate-y-px"
          >
            <Phone size={16} weight="fill" aria-hidden />
            Call Traffic Police 103 for road conditions
          </a>
        </div>
      </div>
    </section>
  );
}
