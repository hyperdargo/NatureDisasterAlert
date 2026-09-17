import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CallButton } from "@/components/CallButton";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist. Here is how to reach the live hazard map.",
  robots: { index: false, follow: true },
};

/**
 * A 404 that is still useful.
 *
 * Someone can land here during an emergency, from a stale link or a mistyped
 * address, so the emergency numbers are on the page rather than one more
 * navigation away. A dead end is a bad outcome anywhere; here it is a
 * dangerous one.
 */
const LINKS = [
  { href: "/", label: "Hazards near me", description: "The live map and what is closest to you" },
  { href: "/prepare", label: "What to do", description: "Guidance for each kind of hazard" },
  { href: "/incidents", label: "Incident log", description: "Every report from the last 30 days" },
  { href: "/install", label: "Install the app", description: "Free on Android and iPhone" },
];

export default function NotFound() {
  return (
    <div className="page max-w-2xl!">
      <p className="readout">Error 404</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,6vw,4rem)] text-ink">
        That page does not exist
      </h1>
      <p className="mt-2 text-sm text-ink-secondary">
        The address may be mistyped, or the page may have moved. Everything
        below still works.
      </p>

      <CallButton />

      <ul className="mt-6 grid gap-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-16 items-center gap-3 rounded-3xl border border-edge bg-surface px-4 py-3 transition-colors hover:border-edge-strong"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{link.label}</span>
                <span className="mt-0.5 block text-xs text-ink-secondary">
                  {link.description}
                </span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
