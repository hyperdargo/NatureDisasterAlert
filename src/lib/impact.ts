import type { Casualties } from "./types";

/**
 * How badly an incident hit people.
 *
 * This is a DERIVED figure, not something any source publishes, so it is
 * always labelled as such in the interface and always shown next to the raw
 * numbers it came from. A reader must be able to check the arithmetic; an
 * impact badge that cannot be traced back to counts is just a vibe.
 *
 * The weights encode one judgement: a death is not a larger version of a
 * displacement. Loss of life dominates the scale, and no amount of property
 * damage can push an incident with no casualties into the top band.
 */
export type ImpactLevel = "none" | "limited" | "moderate" | "severe" | "catastrophic";

export interface Impact {
  level: ImpactLevel;
  label: string;
  /** 0-100, for bar length only. Never presented as a precise quantity. */
  score: number;
  /** The figures that produced the score, in display order. */
  drivers: Array<{ label: string; value: number }>;
  /** True when no source reported any figure at all. */
  unknown: boolean;
}

const WEIGHTS = {
  dead: 40,
  missing: 25,
  injured: 6,
  displaced: 3,
  housesDestroyed: 2,
  affected: 0.25,
} as const;

export const IMPACT_LABEL: Record<ImpactLevel, string> = {
  none: "No reported impact",
  limited: "Limited impact",
  moderate: "Moderate impact",
  severe: "Severe impact",
  catastrophic: "Catastrophic impact",
};

/** Bands are on the weighted total, chosen so one death alone reads "severe". */
function bandFor(total: number, dead: number, missing: number): ImpactLevel {
  if (dead >= 10 || total >= 400) return "catastrophic";
  if (dead >= 1 || missing >= 1 || total >= 120) return "severe";
  if (total >= 25) return "moderate";
  if (total > 0) return "limited";
  return "none";
}

export function computeImpact(casualties: Casualties): Impact {
  const reported = Object.values(casualties).some((value) => value !== null);

  const dead = casualties.dead ?? 0;
  const missing = casualties.missing ?? 0;
  const injured = casualties.injured ?? 0;
  const displaced = casualties.displaced ?? 0;
  const homes = casualties.housesDestroyed ?? 0;
  const affected = casualties.affected ?? 0;

  const total =
    dead * WEIGHTS.dead +
    missing * WEIGHTS.missing +
    injured * WEIGHTS.injured +
    displaced * WEIGHTS.displaced +
    homes * WEIGHTS.housesDestroyed +
    affected * WEIGHTS.affected;

  const level = bandFor(total, dead, missing);

  const drivers = [
    { label: "died", value: dead },
    { label: "missing", value: missing },
    { label: "injured", value: injured },
    { label: "families displaced", value: displaced },
    { label: "homes destroyed", value: homes },
    { label: "people affected", value: affected },
  ].filter((driver) => driver.value > 0);

  return {
    level,
    label: IMPACT_LABEL[level],
    // Compressed with a log so a single huge event does not flatten every
    // other bar to nothing. Bar length only; never shown as a number.
    score: Math.min(100, Math.round((Math.log10(total + 1) / Math.log10(1001)) * 100)),
    drivers,
    unknown: !reported,
  };
}

export const IMPACT_TOKEN: Record<ImpactLevel, string> = {
  catastrophic: "var(--status-critical)",
  severe: "var(--status-critical)",
  moderate: "var(--status-serious)",
  limited: "var(--status-warning)",
  none: "var(--ink-muted)",
};
