"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import type { Stats } from "@/lib/stats";
import type { DisasterEvent } from "@/lib/types";

export interface FeedPayload {
  nepal: DisasterEvent[];
  global: DisasterEvent[];
  stats: Stats;
  degraded: string[];
  generatedAt: string;
}

const REFRESH_MS = 3 * 60 * 1000;

/**
 * The live feed, seeded from whatever the server rendered and refreshed in the
 * background.
 *
 * Shared by every tab so each one does not reimplement polling. `live` is off
 * for the reading tabs, which fetch once on mount: an incident log from three
 * minutes ago is fine, whereas the "near me" view genuinely needs to keep up.
 */
export function useLiveFeed(initial: FeedPayload, days: number, live = true) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        fetch(apiUrl(`/api/events?scope=global&days=${days}`), { cache: "no-store" }),
        fetch(apiUrl(`/api/stats?days=${days}`), { cache: "no-store" }),
      ]);
      if (!eventsRes.ok || !statsRes.ok) throw new Error("refresh failed");

      const eventsJson = (await eventsRes.json()) as {
        events: DisasterEvent[];
        degraded: string[];
        generatedAt: string;
      };
      const statsJson = (await statsRes.json()) as Stats;

      setData({
        nepal: eventsJson.events.filter((event) => event.inNepal),
        global: eventsJson.events.filter((event) => !event.inNepal),
        stats: statsJson,
        degraded: eventsJson.degraded,
        generatedAt: eventsJson.generatedAt,
      });
      // The service worker marks a cached reply, so staleness is stated
      // rather than implied.
      setStale(eventsRes.headers.get("x-from-cache") === "1");
    } catch (error) {
      console.error(error);
      // Keep the last good data on screen, but stop calling it live.
      setStale(true);
    } finally {
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, live]);

  return { data, refresh, refreshing, stale };
}
