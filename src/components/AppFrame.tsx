"use client";

import { CountryProvider } from "./CountryProvider";
import { EmergencySheet } from "./EmergencySheet";
import { LocationProvider } from "./LocationProvider";
import { TabBar } from "./TabBar";

/**
 * Everything that must exist on every page: one geolocation watch, the
 * country it resolves to, the tab bar, and the emergency button.
 *
 * The emergency sheet lives here rather than on the home page because the
 * moment someone needs it is not predictable, and hunting for the right tab
 * during an emergency is exactly the wrong experience.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <CountryProvider>
        {children}
        <EmergencySheet />
        <TabBar />
      </CountryProvider>
    </LocationProvider>
  );
}
