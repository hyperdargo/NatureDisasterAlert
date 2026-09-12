"use client";

import { useState } from "react";
import { HomeView } from "./HomeView";
import type { FeedPayload } from "@/hooks/useLiveFeed";

/**
 * Owns the search radius, which the nearby list and the alert check share.
 * Kept here rather than in HomeView so the choice survives a data refresh.
 */
export function HomeShell({
  initial,
  days,
}: {
  initial: FeedPayload;
  days: number;
}) {
  const [radiusKm, setRadiusKm] = useState(50);
  return (
    <HomeView
      initial={initial}
      days={days}
      radiusKm={radiusKm}
      onRadiusChange={setRadiusKm}
    />
  );
}
