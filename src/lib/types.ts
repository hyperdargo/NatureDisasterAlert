import { z } from "zod";

/**
 * One normalized hazard event, whatever feed it came from.
 * Every source adapter must produce this shape and nothing else -
 * the UI never sees a raw upstream payload.
 */
export const HazardKind = z.enum([
  "flood",
  "landslide",
  "earthquake",
  "fire",
  "storm",
  "lightning",
  "coldwave",
  "heatwave",
  "avalanche",
  "epidemic",
  "drought",
  "volcano",
  "cyclone",
  "accident",
  "animal",
  "other",
]);
export type HazardKind = z.infer<typeof HazardKind>;

/** Four reserved status levels. Never reused for chart series identity. */
export const Severity = z.enum(["good", "warning", "serious", "critical"]);
export type Severity = z.infer<typeof Severity>;

export const SourceId = z.enum(["bipad", "usgs", "gdacs", "eonet"]);
export type SourceId = z.infer<typeof SourceId>;

/**
 * Casualty counts. `null` means "not reported by the source", which is
 * meaningfully different from 0 ("reported as none"). Never coerce null to 0:
 * in a life-safety context an unknown death toll must not render as zero.
 */
export const Casualties = z.object({
  dead: z.number().int().nonnegative().nullable(),
  missing: z.number().int().nonnegative().nullable(),
  injured: z.number().int().nonnegative().nullable(),
  affected: z.number().int().nonnegative().nullable(),
  displaced: z.number().int().nonnegative().nullable(),
  housesDestroyed: z.number().int().nonnegative().nullable(),
  /** Roads damaged or blocked, as reported. Not a closure count. */
  roadsAffected: z.number().int().nonnegative().nullable(),
  bridgesAffected: z.number().int().nonnegative().nullable(),
});
export type Casualties = z.infer<typeof Casualties>;

export const EMPTY_CASUALTIES: Casualties = {
  dead: null,
  missing: null,
  injured: null,
  affected: null,
  displaced: null,
  housesDestroyed: null,
  roadsAffected: null,
  bridgesAffected: null,
};

export const Area = z.object({
  ward: z.string().nullable(),
  municipality: z.string().nullable(),
  municipalityNe: z.string().nullable(),
  district: z.string().nullable(),
  districtNe: z.string().nullable(),
  province: z.string().nullable(),
  districtId: z.number().nullable(),
});
export type Area = z.infer<typeof Area>;

export const DisasterEvent = z.object({
  id: z.string().min(1),
  source: SourceId,
  kind: HazardKind,
  severity: Severity,
  title: z.string().min(1),
  titleNe: z.string().nullable(),
  place: z.string().nullable(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** ISO 8601. When the hazard occurred, not when it was published. */
  occurredAt: z.string().datetime({ offset: true }),
  casualties: Casualties,
  /** Source-specific headline metric, already formatted for display. */
  metric: z.string().nullable(),
  url: z.string().url().nullable(),
  inNepal: z.boolean(),
  /** Administrative area, resolved from the reporting ward. Nepal only. */
  area: Area.nullable(),
});
export type DisasterEvent = z.infer<typeof DisasterEvent>;

export const SOURCE_LABEL: Record<SourceId, string> = {
  bipad: "BIPAD Portal, Government of Nepal",
  usgs: "USGS Earthquake Hazards Program",
  gdacs: "GDACS, European Commission",
  eonet: "NASA Earth Observatory",
};

export const HAZARD_LABEL: Record<HazardKind, string> = {
  flood: "Flood",
  landslide: "Landslide",
  earthquake: "Earthquake",
  fire: "Fire",
  storm: "Storm",
  lightning: "Lightning",
  coldwave: "Cold wave",
  heatwave: "Heat wave",
  avalanche: "Avalanche",
  epidemic: "Epidemic",
  drought: "Drought",
  volcano: "Volcanic activity",
  cyclone: "Cyclone",
  accident: "Accident",
  animal: "Snakebite or animal attack",
  other: "Other hazard",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  good: "Advisory",
  warning: "Watch",
  serious: "Warning",
  critical: "Emergency",
};
