"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import type { OfficialWarning } from "@/lib/types";

type WarningsState =
  | { status: "idle" | "loading" | "failed"; warnings: OfficialWarning[] }
  | { status: "done"; warnings: OfficialWarning[] };

/**
 * Official warnings for a country with a national warning feed. Pass null for
 * countries without one and nothing is requested.
 *
 * "failed" is kept apart from "done with none": a feed that did not answer is
 * not the same as a feed that says there are no warnings.
 */
export function useWarnings(country: string | null): WarningsState {
  const [state, setState] = useState<WarningsState>({ status: "idle", warnings: [] });

  useEffect(() => {
    if (!country) return;
    let cancelled = false;
    const load = async () => {
      setState({ status: "loading", warnings: [] });
      try {
        const response = await fetch(apiUrl(`/api/warnings?country=${encodeURIComponent(country)}`), {
          signal: AbortSignal.timeout(30_000),
        });
        const data = (await response.json()) as { warnings?: OfficialWarning[]; unavailable?: boolean };
        if (cancelled) return;
        if (!response.ok || data.unavailable) throw new Error(`HTTP ${response.status}`);
        setState({ status: "done", warnings: data.warnings ?? [] });
      } catch (error) {
        console.error("warnings failed:", error);
        if (!cancelled) setState({ status: "failed", warnings: [] });
      }
    };
    const timer = setTimeout(() => void load(), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [country]);

  return country ? state : { status: "idle", warnings: [] };
}
