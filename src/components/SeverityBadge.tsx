import { Eye, Info, Siren, Warning } from "@phosphor-icons/react/dist/ssr";
import { SEVERITY_STYLE, type IconName } from "@/lib/display";
import type { Severity } from "@/lib/types";

const ICONS = { siren: Siren, warning: Warning, eye: Eye, info: Info } as const;

function Glyph({ name, size }: { name: IconName; size: number }) {
  const Component = ICONS[name];
  return <Component size={size} weight="fill" aria-hidden />;
}

/**
 * Colour plus icon plus word. All three, always - a status must survive being
 * read in greyscale.
 */
export function SeverityBadge({
  severity,
  size = "md",
}: {
  severity: Severity;
  size?: "sm" | "md";
}) {
  const style = SEVERITY_STYLE[severity];
  const small = size === "sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded border font-medium ${
        small ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
      }`}
      style={{
        color: style.token,
        borderColor: style.token,
        // A wash of the status hue, light enough to keep the text legible.
        backgroundColor: `color-mix(in srgb, ${style.token} 12%, transparent)`,
      }}
    >
      <Glyph name={style.icon} size={small ? 11 : 13} />
      {style.label}
    </span>
  );
}

/** The colour a map pin or chart mark takes for a given severity. */
export function severityColor(severity: Severity): string {
  return SEVERITY_STYLE[severity].token;
}
