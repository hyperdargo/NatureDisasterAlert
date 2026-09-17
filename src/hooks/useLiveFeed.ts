"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCountry } from "@/components/CountryProvider";
import { apiUrl } from "@/lib/api-base";
import { computeStats, type Stats } from "@/lib/stats";
import type { DisasterEvent } from "@/lib/types";

export interface FeedPayload {
  country: string | null;
  /** Located in the country. */
  local: DisasterEvent[];
  /** Everything else the server sent: global feeds and nearby neighbours. */
  elsewhere: DisasterEvent[];
  stats: Stats;
  degraded: string[];
  generatedAt: string;
  /**
   * True when nothing has arrived yet. The interface shows a loading state
   * rather than a screen of zeros, because "0 died" and "not loaded yet" must
   * never look the same.
   */
  pending: boolean;
}

const REFRESH_MS = 3 * 60 * 1000;
/** A copy older than this is refetched when a tab mounts. */
const STALE_MS = 60 * 1000;

export function pendingPayload(country: string | null, days: number): FeedPayload {
  return {
    country,
    local: [],
    elsewhere: [],
    stats: computeStats([], days, country ?? "NP"),
    degraded: [],
    // Epoch, so it always reads as stale and is refetched at once.
    generatedAt: new Date(0).toISOString(),
    pending: true,
  };
}

/**
 * Last good payload per country, kept for the life of the page. Moving between
 * tabs then shows data instantly instead of a loading state each time, and
 * switching back to a country already looked at costs nothing.
 */
const memory = new Map<string, { payload: FeedPayload; fetchedAt: number }>();
const keyOf = (country: string, days: number) => `${country}:${days}`;

/**
 * The live feed for the current country, refreshed in the background.
 *
 * Pages render no data on the server: they cannot know the visitor's country,
 * and a page baked at build time would carry whatever the feed held then. The
 * browser asks once it knows the country, which it does on the first render.
 *
 * `live` is off for the reading tabs, which fetch once on mount: an incident
 * log from three minutes ago is fine, whereas "near me" needs to keep up.
 */
export function useLiveFeed(days: number, live = true) {
  const { code: country } = useCountry();
  const [data, setData] = useState<FeedPayload>(() => pendingPayload(null, days));
  const [refreshing, setRefreshing] = useState(false);
  /**
   * What went wrong, if anything. Telling someone they are offline when the
   * network is fine sends them to check their connection instead of trying
   * again, and during an emergency that is wasted time.
   */
  const [problem, setProblem] = useState<"none" | "offline" | "unreachable">("none");
  /** Shown in the interface: a phone has no console to open. */
  const [lastError, setLastError] = useState<string | null>(null);
  const failures = useRef(0);
  const current = useRef(country);

  const refresh = useCallback(async () => {
    if (!country) return;
    const requested = country;
    setRefreshing(true);
    try {
      const response = await fetch(
        apiUrl(`/api/events?country=${encodeURIComponent(requested)}&days=${days}`),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(`Hazard feed answered HTTP ${response.status}`);
      const json = (await response.json()) as {
        events: DisasterEvent[];
        degraded: string[];
        generatedAt: string;
      };
      // The reader switched country while this was in flight.
      if (current.current !== requested) return;

      const payload: FeedPayload = {
        country: requested,
        local: json.events.filter((event) => event.country === requested),
        elsewhere: json.events.filter((event) => event.country !== requested),
        stats: computeStats(json.events, days, requested),
        degraded: json.degraded,
        generatedAt: json.generatedAt,
        pending: false,
      };
      memory.set(keyOf(requested, days), { payload, fetchedAt: Date.now() });
      setData(payload);
      failures.current = 0;
      setLastError(null);
      // The service worker marks a cached reply, so staleness is stated
      // rather than implied.
      setProblem(response.headers.get("x-from-cache") === "1" ? "offline" : "none");
    } catch (error) {
      if (current.current !== requested) return;
      console.error(error);
      failures.current += 1;
      setLastError(error instanceof Error ? error.message : String(error));
      // With nothing on screen the first failure is reported at once; once
      // data is showing, a single hiccup is not worth announcing.
      const nothingShown = !memory.has(keyOf(requested, days));
      if (failures.current >= 2 || nothingShown) {
        setProblem(
          typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "unreachable",
        );
      }
    } finally {
      if (current.current === requested) setRefreshing(false);
    }
  }, [country, days]);

  // Country known or changed: show what is remembered, refetch if it is old.
  useEffect(() => {
    current.current = country;
    if (!country) return;
    const remembered = memory.get(keyOf(country, days));
    // Deferred off the effect body so it does not cascade a render before paint.
    const timer = setTimeout(() => {
      failures.current = 0;
      setProblem("none");
      setLastError(null);
      setData(remembered?.payload ?? pendingPayload(country, days));
      // Measured from when this tab fetched it, not from when the server
      // assembled the feed, which can be minutes earlier by design.
      const age = remembered ? Date.now() - remembered.fetchedAt : Infinity;
      if (!(age <= STALE_MS)) void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [country, days, refresh]);

  useEffect(() => {
    if (!live || !country) return;
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, live, country]);

  // Coming back online is worth an immediate retry.
  useEffect(() => {
    const onOnline = () => {
      failures.current = 0;
      void refresh();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  return { data, refresh, refreshing, problem, lastError };
}
