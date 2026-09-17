"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Check, Crosshair, MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { useCountry } from "./CountryProvider";
import { useLocation } from "./LocationProvider";
import { allCountries } from "@/lib/countries";
import { numbersFor } from "@/lib/countries/emergency";

/**
 * Choose a country.
 *
 * A native dialog, so Escape, the backdrop and focus trapping behave the way
 * the platform does. Focus lands in the search field and returns to whatever
 * opened the sheet when it closes.
 */
export function CountrySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const country = useCountry();
  const location = useLocation();

  // Sorted by the browser's own country names, which differ from Node's
  // ("Cabo Verde" or "Cape Verde"), so it is built only once the sheet opens,
  // never during server rendering.
  const countries = useMemo(() => (open ? allCountries() : []), [open]);
  const matches = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
  }, [countries, deferred]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      element.showModal();
      input.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  const close = () => {
    onClose();
    setQuery("");
    returnFocus.current?.focus?.();
  };

  const pick = (code: string) => {
    country.choose(code);
    close();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="country-sheet-title"
      onClose={close}
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
      className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-lg bg-transparent p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:mb-auto"
    >
      <div className="flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-edge bg-raised sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <p className="readout">Coverage follows your country</p>
            <h2 id="country-sheet-title" className="mt-1 text-lg font-semibold">
              Where are you?
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="press grid h-10 w-10 place-items-center rounded-full border border-edge text-ink-secondary hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="px-5 pb-3">
          <label className="flex items-center gap-2 rounded-2xl border border-edge bg-surface px-3.5 focus-within:border-edge-strong">
            <MagnifyingGlass size={16} className="shrink-0 text-ink-muted" aria-hidden />
            <span className="sr-only">Search countries</span>
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 237 countries"
              autoComplete="off"
              className="min-h-12 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
            />
          </label>

          {country.source === "chosen" && (
            <button
              type="button"
              onClick={() => {
                country.followDevice();
                if (!location.coords) location.allow();
                close();
              }}
              className="press mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-edge text-sm text-ink-secondary hover:text-ink"
            >
              <Crosshair size={16} aria-hidden />
              Follow my location instead
            </button>
          )}
        </div>

        <ul className="overflow-y-auto overscroll-contain border-t border-edge px-2 py-2" aria-label="Countries">
          {matches.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-secondary">No country matches.</li>
          )}
          {matches.map((c) => {
            const active = c.code === country.code;
            const tier = numbersFor(c.code)?.tier;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => pick(c.code)}
                  aria-current={active ? "true" : undefined}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface"
                >
                  <span aria-hidden className="readout w-7 shrink-0 text-ink-secondary">
                    {c.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  {tier === "checked" && (
                    <span className="readout hidden sm:inline" title="Emergency numbers checked against an official source">
                      Numbers checked
                    </span>
                  )}
                  {active && <Check size={16} className="shrink-0 text-ice" aria-label="Selected" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
