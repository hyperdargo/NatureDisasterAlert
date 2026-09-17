"use client";

import { BellRinging, BellSlash } from "@phosphor-icons/react/dist/ssr";

/**
 * The alert toggle.
 *
 * Every state says something. Previously a refused permission left the button
 * showing its original label and doing nothing when tapped, because Android
 * will not present the system dialog a second time. That reads as a broken
 * button, which is worse than an honest "blocked".
 */
export function NotificationToggle({
  enabled,
  supported,
  blocked,
  onEnable,
}: {
  enabled: boolean;
  supported: boolean;
  blocked: boolean;
  onEnable: () => void;
}) {
  if (!supported) return null;

  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-edge px-2.5 py-1 text-xs text-ink-muted">
        <BellSlash size={13} aria-hidden />
        Alerts blocked. Turn notifications on for this app in your device
        settings.
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onEnable}
      disabled={enabled}
      className="inline-flex min-h-9 items-center gap-1.5 rounded border border-edge px-2.5 py-1 text-xs text-ink-secondary transition-colors hover:border-edge-strong hover:text-ink disabled:cursor-default disabled:opacity-60"
    >
      <BellRinging size={13} weight={enabled ? "fill" : "regular"} aria-hidden />
      {enabled ? "Alerts on" : "Alert me when something is near"}
    </button>
  );
}
