"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CountrySheet } from "./CountrySheet";
import { useLocation } from "./LocationProvider";
import { createBrowserStore, useBrowserStore } from "@/hooks/useBrowserState";
import {
  countryFromTimeZone,
  countryInfo,
  deviceTimeZone,
  isCountryCode,
  locateIn,
  type Borders,
  type CountryInfo,
} from "@/lib/countries";

/**
 * Which country the interface is set to, and how it knows.
 *
 * Three signals, in order of authority:
 *
 *   1. The reader's own choice, remembered on this device.
 *   2. Their GPS fix, matched against country borders in the browser. The
 *      position never leaves the device for this.
 *   3. The device time zone. Instant and needs no permission, but only a
 *      guess, and labelled as one.
 *
 * A choice is never silently overridden. If GPS later disagrees with it, for
 * a traveller who picked home and then crossed a border, the interface offers
 * to switch instead of switching, because emergency numbers changing under
 * someone's thumb is worse than a one-tap prompt.
 */
export type CountrySource = "chosen" | "location" | "timezone";

interface CountryState {
  /** Null only before the first client render, or when nothing can be guessed. */
  code: string | null;
  info: CountryInfo | null;
  source: CountrySource | null;
  /** The country GPS says, when it differs from the one chosen. */
  suggestion: string | null;
  choose: (code: string) => void;
  /** Forget the choice and follow location or time zone again. */
  followDevice: () => void;
  dismissSuggestion: () => void;
  openPicker: () => void;
}

const STORAGE_KEY = "nda.country";

const chosenStore = createBrowserStore<string | null>(() => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isCountryCode(value) ? value : null;
  } catch {
    return null;
  }
}, null);

/** Stable per page load, and null on the server so hydration agrees. */
const timeZoneStore = createBrowserStore<string | null>(
  () => countryFromTimeZone(deviceTimeZone()),
  null,
);

let bordersPromise: Promise<Borders> | null = null;

/** The 158 KB border set loads only once a GPS fix exists to test against it. */
function loadBorders(): Promise<Borders> {
  bordersPromise ??= import("@/data/borders-110m.json").then(
    (module) => (module.default ?? module) as unknown as Borders,
  );
  return bordersPromise;
}

const CountryContext = createContext<CountryState | null>(null);

export function CountryProvider({ children }: { children: ReactNode }) {
  const { coords } = useLocation();
  const chosen = useBrowserStore(chosenStore);
  const fromTimeZone = useBrowserStore(timeZoneStore);
  const [fromLocation, setFromLocation] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Round to ~11 km so the lookup reruns when someone actually moves, not on
  // every GPS jitter.
  const lat = coords ? Math.round(coords.lat * 10) / 10 : null;
  const lon = coords ? Math.round(coords.lon * 10) / 10 : null;

  useEffect(() => {
    if (lat === null || lon === null) return;
    let cancelled = false;
    loadBorders()
      .then((borders) => {
        if (cancelled) return;
        // At sea or in a disputed area there is no answer; keep the last one.
        const found = locateIn(borders, lat, lon);
        if (found) setFromLocation(found);
      })
      .catch((error) => console.error("country borders failed to load:", error));
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const choose = useCallback((code: string) => {
    if (!isCountryCode(code)) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* Not remembered across visits, but applied now. */
    }
    chosenStore.notify();
    setDismissed(null);
  }, []);

  const followDevice = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Nothing stored to remove. */
    }
    chosenStore.notify();
  }, []);

  const dismissSuggestion = useCallback(() => setDismissed(fromLocation), [fromLocation]);
  const openPicker = useCallback(() => setPickerOpen(true), []);

  const value = useMemo<CountryState>(() => {
    const code = chosen ?? fromLocation ?? fromTimeZone;
    const source: CountrySource | null = chosen
      ? "chosen"
      : fromLocation
        ? "location"
        : fromTimeZone
          ? "timezone"
          : null;
    const suggestion =
      chosen && fromLocation && fromLocation !== chosen && dismissed !== fromLocation
        ? fromLocation
        : null;
    return {
      code,
      info: code ? countryInfo(code) : null,
      source,
      suggestion,
      choose,
      followDevice,
      dismissSuggestion,
      openPicker,
    };
  }, [chosen, fromLocation, fromTimeZone, dismissed, choose, followDevice, dismissSuggestion, openPicker]);

  return (
    <CountryContext.Provider value={value}>
      {children}
      <CountrySheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryState {
  const context = useContext(CountryContext);
  if (!context) throw new Error("useCountry must be used inside CountryProvider");
  return context;
}
