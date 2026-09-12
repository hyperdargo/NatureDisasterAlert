import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone } from "@phosphor-icons/react/dist/ssr";

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
    <div className="mx-auto max-w-2xl py-6">
      <p className="tabular text-sm text-ink-muted">404</p>
      <h1 className="mt-2 text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
        That page does not exist
      </h1>
      <p className="mt-2 text-sm text-ink-secondary">
        The address may be mistyped, or the page may have moved. Everything
        below still works.
      </p>

      <a
        href="tel:100"
        className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-lg text-sm font-medium text-white transition-transform active:translate-y-px"
        style={{ background: "var(--status-critical)" }}
      >
        <Phone size={17} weight="fill" aria-hidden />
        Emergency? Call 100
      </a>

      <ul className="mt-6 grid gap-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-16 items-center gap-3 rounded-lg border border-edge bg-surface px-4 py-3 transition-colors hover:border-edge-strong"
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
