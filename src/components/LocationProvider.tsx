"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";

type LocationState = ReturnType<typeof useGeolocation>;

const LocationContext = createContext<LocationState | null>(null);

/**
 * One geolocation watch for the whole app.
 *
 * Now that the interface is split across tabs, several things need the
 * position at once: the nearby list, the map, and the emergency sheet, which
 * lives in the layout and is reachable from every page. Each calling
 * `useGeolocation` separately would open a separate `watchPosition`, and on a
 * phone that means several GPS subscriptions running in parallel and draining
 * the battery. This mounts exactly one, in the layout, and shares it.
 *
 * The position still never leaves the device except for the coarse
 * nearby-services lookup, which says so at the point of use.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const location = useGeolocation();
  return (
    <LocationContext.Provider value={location}>{children}</LocationContext.Provider>
  );
}

export function useLocation(): LocationState {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used inside LocationProvider");
  }
  return context;
}
