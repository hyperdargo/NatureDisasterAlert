"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import type { Stats } from "@/lib/stats";
import type { DisasterEvent } from "@/lib/types";

export interface FeedPayload {
  nepal: DisasterEvent[];
  global: DisasterEvent[];
  stats: Stats;
  degraded: string[];
  generatedAt: string;
  /**
   * True when the server sent no data at all, which happens only in the
   * packaged app. The interface shows a loading state rather than a screen of
   * zeros, because "0 died" and "not loaded yet" must never look the same.
   */
  pending?: boolean;
}

const REFRESH_MS = 3 * 60 * 1000;

/** Anything older than this on first render is refetched immediately. */
const STALE_ON_MOUNT_MS = 60 * 1000;

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
  /**
   * What went wrong, if anything. Distinguishing these matters: telling
   * someone they are offline when the network is fine sends them to check
   * their connection instead of trying again, and during an emergency that is
   * wasted time.
   */
  const [problem, setProblem] = useState<"none" | "offline" | "unreachable">("none");
  // A single hiccup is not worth announcing; the feed is polled every few
  // minutes and the server is served stale-while-revalidate behind it.
  const failures = useRef(0);
  /**
   * The last failure message, shown in the interface rather than only logged.
   * A phone has no console to open, so a silent failure there is
   * undiagnosable: the app just sits there looking empty.
   */
  const [lastError, setLastError] = useState<string | null>(null);
  /**
   * Whether anything has loaded yet, held in a ref rather than read from
   * state inside refresh(). Depending on `data` there would rebuild the
   * callback on every update and restart the polling interval each time.
   */
  const hasNoData = useRef(initial.pending ?? false);

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
        pending: false,
        nepal: eventsJson.events.filter((event) => event.inNepal),
        global: eventsJson.events.filter((event) => !event.inNepal),
        stats: statsJson,
        degraded: eventsJson.degraded,
        generatedAt: eventsJson.generatedAt,
      });
      failures.current = 0;
      hasNoData.current = false;
      setLastError(null);
      // The service worker marks a cached reply, so staleness is stated
      // rather than implied.
      setProblem(eventsRes.headers.get("x-from-cache") === "1" ? "offline" : "none");
    } catch (error) {
      console.error(error);
      failures.current += 1;
      setLastError(error instanceof Error ? error.message : String(error));
      // With no data on screen there is nothing to protect, so the first
      // failure is reported at once. Once data is showing, a single hiccup is
      // not worth announcing and two consecutive failures are required.
      if (failures.current >= 2 || hasNoData.current) {
        setProblem(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? "offline"
            : "unreachable",
        );
      }
    } finally {
      setRefreshing(false);
    }
  }, [days]);

  /**
   * Refresh on mount when the data we were handed is already old.
   *
   * On the website the server rendered moments ago, so this does nothing. In
   * the packaged Android app the interface is compiled into the APK along with
   * a snapshot taken at build time, which could be weeks stale by the time
   * someone installs it. Without this the app would open showing figures from
   * whenever the APK was built, which in a disaster app is the worst possible
   * failure: confidently wrong, and no indication anything is amiss.
   */
  useEffect(() => {
    const age = Date.now() - Date.parse(initial.generatedAt);
    if (!Number.isNaN(age) && age <= STALE_ON_MOUNT_MS) return;

    // Started on a timer rather than inline: refresh() flips loading state
    // immediately, and doing that inside an effect body cascades a second
    // render before the first has painted.
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
    // Deliberately mount-only; later refreshes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Coming back online is worth an immediate retry rather than waiting out
  // the poll interval.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      failures.current = 0;
      void refresh();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  return { data, refresh, refreshing, problem, lastError };
}
