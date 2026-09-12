"use client";

import { EmergencySheet } from "./EmergencySheet";
import { LocationProvider, useLocation } from "./LocationProvider";
import { TabBar } from "./TabBar";

/**
 * Everything that must exist on every page: one geolocation watch, the tab
 * bar, and the emergency button.
 *
 * The emergency sheet lives here rather than on the home page because the
 * moment someone needs it is not predictable, and hunting for the right tab
 * during an emergency is exactly the wrong experience.
 */
function Chrome() {
  const location = useLocation();
  return (
    <>
      <EmergencySheet coords={location.coords} />
      <TabBar />
    </>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      {children}
      <Chrome />
    </LocationProvider>
  );
}
