"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowSquareOut,
  Info,
  MapPin,
  Phone,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { coarsenForLookup } from "@/lib/coarsen";
import {
  ORGANISATIONS,
  SHORT_CODES,
  SNAKEBITE_NOTE,
  type Contact,
} from "@/lib/emergency-contacts";
import type { Coords } from "@/hooks/useGeolocation";

/**
 * Nepal's emergency numbers are national: 100 reaches police anywhere in the
 * country, and the disaster helpline is the same number in Humla as in
 * Kathmandu. So "emergency numbers for my location" resolves to two different
 * things, and both are shown:
 *
 *   1. The national short codes, which always work and never change.
 *   2. The nearest hospitals, clinics, police and fire stations, which are
 *      genuinely location-specific.
 *
 * Every number is a tel: link, so tapping one opens the dialler with the
 * number already entered.
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

export function EmergencySheet({ coords }: { coords: Coords | null }) {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const dialog = useRef<HTMLDialogElement>(null);
  const requested = useRef<string | null>(null);

  const load = useCallback(async (position: Coords) => {
    // Coarsened before it leaves the tab, so a precise position is never sent.
    const lat = coarsenForLookup(position.lat);
    const lon = coarsenForLookup(position.lon);
    const key = `${lat},${lon}`;
    if (requested.current === key) return;
    requested.current = key;

    setState("loading");
    try {
      const response = await fetch(`/api/services?lat=${lat}&lon=${lon}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as {
        services: EmergencyService[];
        unavailable?: boolean;
      };
      setServices(data.services ?? []);
      setState(data.unavailable ? "failed" : "done");
    } catch (error) {
      console.error("nearby services failed:", error);
      setState("failed");
      requested.current = null;
    }
  }, []);

  // Opening the sheet is an event, so the lookup is fired from the handler
  // rather than an effect. If a position only arrives after the sheet is
  // already open, the panel offers an explicit button instead of silently
  // firing a request the reader did not ask for.
  const openSheet = useCallback(() => {
    setOpen(true);
    if (coords) void load(coords);
  }, [coords, load]);

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
        className="fixed right-4 bottom-4 z-40 flex min-h-14 items-center gap-2 rounded-full px-5 text-sm font-medium text-white shadow-lg transition-transform active:translate-y-px sm:right-6 sm:bottom-6"
        style={{
          background: "var(--status-critical)",
          // Clear of the iOS home indicator when installed to the home screen.
          marginBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <Phone size={20} weight="fill" aria-hidden />
        Emergency
      </button>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicking the backdrop closes; clicking the panel does not.
          if (event.target === dialog.current) setOpen(false);
        }}
        className="mx-auto mt-auto mb-0 max-h-[88dvh] w-full max-w-lg bg-transparent p-0 backdrop:bg-black/60 sm:mb-auto"
      >
        <div className="flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl border border-edge bg-raised sm:rounded-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
            <h2 className="text-base font-medium text-ink">Get help now</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-secondary hover:bg-surface hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div
            className="overflow-y-auto overscroll-contain px-4 py-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <h3 className="text-xs font-medium text-ink-secondary">
              National numbers, free from any phone
            </h3>
            <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SHORT_CODES.map((contact) => (
                <li key={contact.number}>
                  <CallRow contact={contact} emphasis />
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-edge p-3">
              <Info size={15} weight="fill" className="mt-px shrink-0 text-ink-muted" aria-hidden />
              <p className="text-xs leading-relaxed text-ink-secondary">
                <strong className="font-medium text-ink">{SNAKEBITE_NOTE.title}.</strong>{" "}
                {SNAKEBITE_NOTE.body}
              </p>
            </div>

            <h3 className="mt-6 text-xs font-medium text-ink-secondary">
              Response organisations
            </h3>
            <p className="mt-1 text-[11px] text-ink-muted">
              Office lines, not emergency lines. Numbers change, so each one
              links to its own site to check.
            </p>
            <ul className="mt-2.5 grid grid-cols-1 gap-2">
              {ORGANISATIONS.map((contact) => (
                <li key={contact.number}>
                  <CallRow contact={contact} />
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-xs font-medium text-ink-secondary">Nearest to you</h3>

            {!coords && (
              <p className="mt-2 rounded-lg border border-dashed border-edge p-4 text-sm text-ink-secondary">
                Turn on location to see the closest hospitals and police stations.
              </p>
            )}

            {coords && state === "idle" && (
              <button
                type="button"
                onClick={() => void load(coords)}
                className="mt-2 w-full rounded-lg border border-edge py-2.5 text-sm text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink"
              >
                Find nearby hospitals and police
              </button>
            )}

            {coords && state === "loading" && (
              <p className="mt-2 text-sm text-ink-secondary">Finding nearby services</p>
            )}

            {coords && state === "failed" && services.length === 0 && (
              <p className="mt-2 rounded-lg border border-dashed border-edge p-4 text-sm text-ink-secondary">
                Nearby services could not be loaded. The national numbers above
                still work.
              </p>
            )}

            {coords && state === "done" && services.length === 0 && (
              <p className="mt-2 rounded-lg border border-dashed border-edge p-4 text-sm text-ink-secondary">
                No mapped facilities within 15 km.
              </p>
            )}

            {services.length > 0 && (
              <ul className="mt-2 divide-y divide-edge overflow-hidden rounded-lg border border-edge">
                {services.map((service) => (
                  <li key={service.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{service.name}</p>
                      <p className="tabular mt-0.5 text-xs text-ink-muted">
                        {SERVICE_LABEL[service.kind]} · {service.distanceKm.toFixed(1)} km
                      </p>
                    </div>

                    {service.phone ? (
                      <a
                        href={`tel:${service.phone.replace(/[^\d+]/g, "")}`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-edge-strong text-ink transition-colors active:translate-y-px"
                        aria-label={`Call ${service.name}`}
                      >
                        <Phone size={17} weight="fill" aria-hidden />
                      </a>
                    ) : (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${service.lat}&mlon=${service.lon}#map=17/${service.lat}/${service.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-edge text-ink-secondary transition-colors active:translate-y-px"
                        aria-label={`Show ${service.name} on a map`}
                      >
                        <MapPin size={17} aria-hidden />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
              Facility details come from OpenStreetMap and are incomplete for
              much of Nepal, so many places have no published number. To find
              them, your location is rounded to about 1 km before it is sent,
              and it is not stored.
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}

/**
 * One dialable row. The number is the tap target, so it is sized for a thumb
 * and the whole row is the link rather than just the digits.
 */
function CallRow({ contact, emphasis = false }: { contact: Contact; emphasis?: boolean }) {
  return (
    <div className="flex items-stretch gap-2">
      <a
        href={`tel:${contact.number.replace(/[^\d+]/g, "")}`}
        className="flex min-h-14 flex-1 items-center gap-3 rounded-lg border border-edge px-3.5 transition-colors hover:border-edge-strong active:translate-y-px"
      >
        <Phone
          size={18}
          weight={emphasis ? "fill" : "regular"}
          className="shrink-0 text-ink-secondary"
          aria-hidden
        />
        <span className="min-w-0 flex-1 py-2">
          <span className="block text-sm text-ink">{contact.label}</span>
          <span className="block text-[11px] leading-tight text-ink-muted">
            {contact.note}
          </span>
        </span>
        <span
          className={`tabular whitespace-nowrap font-medium text-ink ${
            emphasis ? "text-xl" : "text-sm"
          }`}
        >
          {contact.number}
        </span>
      </a>

      {contact.verifyUrl && (
        <a
          href={contact.verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Check ${contact.label} details on their website`}
          className="grid w-11 shrink-0 place-items-center rounded-lg border border-edge text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
        >
          <ArrowSquareOut size={15} aria-hidden />
        </a>
      )}
    </div>
  );
}
