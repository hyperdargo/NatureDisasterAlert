"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowSquareOut,
  Info,
  MapPin,
  Phone,
  SealCheck,
  Warning,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { useCountry } from "./CountryProvider";
import { useLocation } from "./LocationProvider";
import { coarsenForLookup } from "@/lib/coarsen";
import { apiUrl } from "@/lib/api-base";
import {
  CHECKED_ON,
  NO_NUMBERS_FALLBACK,
  dialable,
  headlineNumber,
  numbersFor,
  type Line,
} from "@/lib/countries/emergency";
import type { Coords } from "@/hooks/useGeolocation";

/**
 * Get help now, from any page.
 *
 * "Emergency numbers for my location" resolves to two different things, and
 * both are shown:
 *
 *   1. The country's numbers, labelled by how far they can be trusted:
 *      checked against an official source, or taken from a compiled list.
 *   2. The nearest hospitals, clinics, police and fire stations, which are
 *      genuinely location-specific, from OpenStreetMap.
 *
 * Every number is a tel: link built from digits only.
 */
type ServiceKind = "hospital" | "clinic" | "police" | "fire";

interface EmergencyService {
  id: string;
  kind: ServiceKind;
  name: string;
  phone: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
}

const SERVICE_LABEL: Record<ServiceKind, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  police: "Police",
  fire: "Fire station",
};

type LoadState = "idle" | "loading" | "done" | "failed";

export function EmergencySheet() {
  const { coords } = useLocation();
  const country = useCountry();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const dialog = useRef<HTMLDialogElement>(null);
  const requested = useRef<string | null>(null);

  const numbers = numbersFor(country.code);
  const headline = headlineNumber(numbers);

  const load = useCallback(async (position: Coords) => {
    // Coarsened before it leaves the tab, so a precise position is never sent.
    const lat = coarsenForLookup(position.lat);
    const lon = coarsenForLookup(position.lon);
    const key = `${lat},${lon}`;
    if (requested.current === key) return;
    requested.current = key;

    setState("loading");
    try {
      const response = await fetch(apiUrl(`/api/services?lat=${lat}&lon=${lon}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { services: EmergencyService[]; unavailable?: boolean };
      setServices(data.services ?? []);
      setState(data.unavailable ? "failed" : "done");
    } catch (error) {
      console.error("nearby services failed:", error);
      setState("failed");
      requested.current = null;
    }
  }, []);

  // Opening is an event, so the lookup fires from the handler, not an effect.
  const openSheet = useCallback(() => {
    setOpen(true);
    if (coords) void load(coords);
  }, [coords, load]);

  // Other parts of the page (the home screen's call button for countries with
  // no known number) open the sheet through this event.
  useEffect(() => {
    const onOpen = () => openSheet();
    window.addEventListener("nda:open-emergency", onOpen);
    return () => window.removeEventListener("nda:open-emergency", onOpen);
  }, [openSheet]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-haspopup="dialog"
        className="press fixed right-4 bottom-20 z-40 flex min-h-14 items-center gap-2.5 rounded-full bg-alarm py-2 pr-5 pl-2 text-white shadow-[0_10px_40px_rgb(212_45_36/0.45)] lg:right-6 lg:bottom-6"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
          <Phone size={19} weight="fill" aria-hidden />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-semibold">Emergency</span>
          {headline && <span className="tabular block text-xs text-white/85">{headline.number}</span>}
        </span>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="emergency-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current) setOpen(false);
        }}
        className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-lg bg-transparent p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:mb-auto"
      >
        <div className="flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-edge bg-raised sm:rounded-3xl">
          <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <p className="readout">
                {country.info ? `${country.info.code} · ${country.info.name}` : "No country set"}
              </p>
              <h2 id="emergency-title" className="mt-1 text-lg font-semibold">
                Get help now
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="press grid h-10 w-10 place-items-center rounded-full border border-edge text-ink-secondary hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div
            className="overflow-y-auto overscroll-contain px-5 pb-5"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {numbers ? (
              <>
                <ul className="grid gap-2">
                  {numbers.primary.map((line) => (
                    <li key={`${line.label}-${line.number}`}>
                      <CallRow line={line} emphasis />
                    </li>
                  ))}
                </ul>

                <TrustNote
                  checked={numbers.tier === "checked"}
                  sourceName={numbers.sourceName}
                  sourceUrl={numbers.sourceUrl}
                />

                {numbers.other.length > 0 && (
                  <ul className="mt-3 grid gap-2">
                    {numbers.other.map((line) => (
                      <li key={`${line.label}-${line.number}`}>
                        <CallRow line={line} />
                      </li>
                    ))}
                  </ul>
                )}

                {numbers.unconfirmed.length > 0 && (
                  <>
                    <h3 className="readout mt-6">Not re-checked</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Widely published, but no official page confirmed these on {CHECKED_ON}.
                      If one fails, use the numbers above.
                    </p>
                    <ul className="mt-2 grid gap-2">
                      {numbers.unconfirmed.map((line) => (
                        <li key={`${line.label}-${line.number}`}>
                          <CallRow line={line} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {country.code === "NP" && (
                  <div className="mt-5 flex items-start gap-2 rounded-2xl border border-edge p-3.5">
                    <Info size={15} weight="fill" className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                    <p className="text-xs leading-relaxed text-ink-secondary">
                      <strong className="font-semibold text-ink">Snakebite.</strong> There is no
                      snakebite hotline. Call an ambulance on 102 and get to a hospital that stocks
                      antivenom. Keep the person still and do not cut, suck or tie the wound.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-edge-strong p-4">
                <p className="flex items-start gap-2 text-sm text-ink">
                  <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden />
                  {country.code ? NO_NUMBERS_FALLBACK.body : "Choose your country to see its emergency numbers."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {country.code && (
                    <a
                      href="tel:112"
                      className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-alarm px-4 text-sm font-semibold text-white"
                    >
                      <Phone size={15} weight="fill" aria-hidden /> Try 112 from a mobile
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      country.openPicker();
                    }}
                    className="press inline-flex min-h-11 items-center rounded-full border border-edge-strong px-4 text-sm"
                  >
                    {country.code ? "Wrong country?" : "Choose country"}
                  </button>
                </div>
              </div>
            )}

            <h3 className="readout mt-8">Nearest to you</h3>

            {!coords && (
              <p className="mt-2 rounded-2xl border border-dashed border-edge p-4 text-sm text-ink-secondary">
                Turn on location to see the closest hospitals and police stations.
              </p>
            )}
            {coords && state === "idle" && (
              <button
                type="button"
                onClick={() => void load(coords)}
                className="press mt-2 min-h-12 w-full rounded-2xl border border-edge text-sm text-ink-secondary hover:text-ink"
              >
                Find nearby hospitals and police
              </button>
            )}
            {coords && state === "loading" && (
              <p className="mt-2 text-sm text-ink-secondary" role="status">
                Finding nearby services
              </p>
            )}
            {coords && state === "failed" && services.length === 0 && (
              <p className="mt-2 rounded-2xl border border-dashed border-edge p-4 text-sm text-ink-secondary">
                Nearby services could not be loaded. The numbers above still work.
              </p>
            )}
            {coords && state === "done" && services.length === 0 && (
              <p className="mt-2 rounded-2xl border border-dashed border-edge p-4 text-sm text-ink-secondary">
                No mapped facilities within 15 km.
              </p>
            )}
            {services.length > 0 && (
              <ul className="mt-2 divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
                {services.map((service) => {
                  const phone = service.phone ? service.phone.replace(/[^\d+]/g, "") : null;
                  return (
                    <li key={service.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{service.name}</p>
                        <p className="readout tabular mt-0.5">
                          {SERVICE_LABEL[service.kind]} · {service.distanceKm.toFixed(1)} km
                        </p>
                      </div>
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-edge-strong text-ink"
                          aria-label={`Call ${service.name}`}
                        >
                          <Phone size={17} weight="fill" aria-hidden />
                        </a>
                      ) : (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${service.lat}&mlon=${service.lon}#map=17/${service.lat}/${service.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-edge text-ink-secondary"
                          aria-label={`Show ${service.name} on a map`}
                        >
                          <MapPin size={17} aria-hidden />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
              Facility details come from OpenStreetMap and are incomplete in many places, so some
              have no published number. To find them, your location is rounded to about 1 km before
              it is sent, and it is not stored.
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}

function TrustNote({
  checked,
  sourceName,
  sourceUrl,
}: {
  checked: boolean;
  sourceName: string;
  sourceUrl: string;
}) {
  return (
    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-secondary">
      {checked ? (
        <SealCheck size={15} weight="fill" className="mt-px shrink-0 text-good" aria-hidden />
      ) : (
        <Warning size={15} weight="fill" className="mt-px shrink-0 text-warning" aria-hidden />
      )}
      <span>
        {checked
          ? `Checked against ${sourceName} on ${CHECKED_ON}.`
          : "From a public compiled list, not an official source. Confirm with someone local when you can."}{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-ink underline underline-offset-2"
        >
          Source <ArrowSquareOut size={11} aria-hidden />
        </a>
      </span>
    </p>
  );
}

/** One dialable row. The whole row is the link, sized for a thumb. */
function CallRow({ line, emphasis = false }: { line: Line; emphasis?: boolean }) {
  const digits = dialable(line.number);
  if (!digits) return null;
  return (
    <a
      href={`tel:${digits}`}
      className={`press flex min-h-14 items-center gap-3 rounded-2xl border px-4 ${
        emphasis ? "border-edge-strong bg-surface" : "border-edge"
      }`}
    >
      <Phone size={18} weight={emphasis ? "fill" : "regular"} className="shrink-0 text-critical" aria-hidden />
      <span className="min-w-0 flex-1 py-2">
        <span className="block text-sm text-ink">{line.label}</span>
        {line.note && <span className="block text-[11px] leading-tight text-ink-muted">{line.note}</span>}
      </span>
      <span className={`tabular font-semibold whitespace-nowrap text-ink ${emphasis ? "text-2xl" : "text-base"}`}>
        {line.number}
      </span>
    </a>
  );
}
