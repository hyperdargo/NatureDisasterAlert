import type { Area, HazardKind, Severity } from "./types";

/**
 * Severity presentation. Each level carries an icon and a word as well as a
 * colour, so the level never depends on colour alone - that is what keeps it
 * readable for colour-blind users, in print, and under forced-colors.
 */
/**
 * `token` is the CSS custom property, used anywhere the DOM does the painting
 * and the value can follow the theme. `hex` is the same colour resolved,
 * because MapLibre parses colours itself on a canvas and cannot read a CSS
 * variable. The status scale is mode-invariant by design, so the two never
 * drift apart.
 */
export const SEVERITY_STYLE: Record<
  Severity,
  { label: string; token: string; hex: string; icon: IconName; rank: number }
> = {
  critical: {
    label: "Emergency",
    token: "var(--status-critical)",
    hex: "#d03b3b",
    icon: "siren",
    rank: 3,
  },
  serious: {
    label: "Warning",
    token: "var(--status-serious)",
    hex: "#ec835a",
    icon: "warning",
    rank: 2,
  },
  warning: {
    label: "Watch",
    token: "var(--status-warning)",
    hex: "#fab219",
    icon: "eye",
    rank: 1,
  },
  good: {
    label: "Advisory",
    token: "var(--status-good)",
    hex: "#0ca30c",
    icon: "info",
    rank: 0,
  },
};

export type IconName = "siren" | "warning" | "eye" | "info";

/** Which hazards a person can be warned about meaningfully by proximity. */
export const PROXIMITY_RELEVANT: ReadonlySet<HazardKind> = new Set<HazardKind>([
  "flood",
  "landslide",
  "earthquake",
  "fire",
  "storm",
  "lightning",
  "avalanche",
  "cyclone",
]);

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 hours ago" style stamps, computed against a caller-supplied clock so
 *  server and client renders agree and hydration stays stable. */
export function relativeTime(iso: string, now: number): string {
  const diffMs = Date.parse(iso) - now;
  // The clock ticks in whole minutes, so a fresh timestamp can land slightly
  // ahead of it. Never phrase the recent past as the future.
  if (diffMs > -30_000 && diffMs < 90_000) return "just now";
  const mins = Math.round(diffMs / 60_000);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

export const nepalDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const nepalDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "2-digit",
  month: "short",
});

/**
 * Render a count that may legitimately be unknown.
 * A missing figure must never print as "0" in a casualty context.
 */
export function formatCount(n: number | null): string {
  if (n === null) return "not reported";
  return n.toLocaleString("en-US");
}

/**
 * "Belbari Municipality-8, Morang" - how an address is actually spoken in
 * Nepal, narrowest part first. Safe to call from client components.
 */
export function formatAreaLabel(area: Area | null): string | null {
  if (!area) return null;
  const local = [area.municipality, area.ward].filter(Boolean).join("-");
  return [local || null, area.district].filter(Boolean).join(", ") || null;
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}
