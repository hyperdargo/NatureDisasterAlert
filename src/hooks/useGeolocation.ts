"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserStore, useBrowserStore } from "./useBrowserState";

/**
 * Live position, held only in the browser.
 *
 * Coordinates are never sent to our server or to any third party. Proximity is
 * computed in this tab against the hazard list the server already returned, so
 * the app can tell you what is near you without ever learning where you are.
 * That is why there is no account system here: there is nothing to store.
 */
export type LocationStatus =
  | "idle"
  | "prompting"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

export interface Coords {
  lat: number;
  lon: number;
  accuracyM: number;
}

const CONSENT_KEY = "nda.location-consent";

/**
 * Whether this visitor has already answered the location question.
 * Storage throws in private mode and when site data is blocked, so every
 * access is guarded and simply degrades to "not asked yet".
 */
const consentStore = createBrowserStore<"yes" | "no" | null>(() => {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "yes" || value === "no" ? value : null;
  } catch {
    return null;
  }
}, null);

function writeConsent(value: "yes" | "no") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* Consent is simply not remembered; the app still works. */
  }
  consentStore.notify();
}

export function useGeolocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  /** True until we know whether this visitor has been asked before. */
  const [resolvingConsent, setResolvingConsent] = useState(true);
  const consent = useBrowserStore(consentStore);
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      setMessage("This browser cannot provide a location.");
      return;
    }
    setStatus("prompting");
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        });
        setStatus("granted");
        setMessage(null);
        writeConsent("yes");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          setMessage("Location permission was declined.");
          writeConsent("no");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setStatus("error");
          setMessage("Your position could not be determined right now.");
        } else {
          setStatus("error");
          setMessage("Finding your location timed out.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 },
    );
  }, []);

  // Re-arm silently for visitors who already said yes, so the explanation card
  // is shown once rather than on every visit.
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (consentStore.getSnapshot() === "yes") {
        start();
      } else if (navigator.permissions?.query) {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          if (!cancelled && result.state === "granted") start();
        } catch {
          /* Permissions API unsupported; fall back to the explicit prompt. */
        }
      }
      if (!cancelled) setResolvingConsent(false);
    };
    void resolve();

    return () => {
      cancelled = true;
    };
  }, [start]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const allow = useCallback(() => {
    start();
  }, [start]);

  const decline = useCallback(() => {
    writeConsent("no");
    setStatus("denied");
  }, []);

  return {
    status,
    coords,
    message,
    allow,
    decline,
    hasAsked: consent !== null,
    resolvingConsent,
  };
}
