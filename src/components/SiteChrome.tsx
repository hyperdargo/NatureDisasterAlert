import Link from "next/link";
import Image from "next/image";
import { SOURCE_LABEL, type SourceId } from "@/lib/types";

/** Nepal's national emergency numbers, repeated in the footer on every page. */
export const EMERGENCY_NUMBERS = [
  { label: "Police", number: "100" },
  { label: "Ambulance", number: "102" },
  { label: "Fire", number: "101" },
  { label: "Disaster helpline", number: "1149" },
  { label: "Traffic police", number: "103" },
] as const;

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-edge bg-page/85 backdrop-blur-sm"
      // Clears the status bar on a phone. The native layer is told not to
      // overlay the WebView, but a notch or a browser in fullscreen can still
      // intrude, and this costs nothing when the inset is zero.
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo-badge.png"
            alt=""
            width={34}
            height={34}
            className="shrink-0"
            priority
          />
          <span className="min-w-0">
            <span className="block truncate text-sm leading-tight font-medium text-ink">
              Nature Disaster Alert
            </span>
            <span className="block truncate text-[11px] leading-tight text-ink-muted">
              by DTEmpire
            </span>
          </span>
        </Link>

        <nav
          className="ml-auto hidden items-center gap-0.5 text-sm md:flex"
          aria-label="Main"
        >
          {[
            { href: "/", label: "Near me" },
            { href: "/incidents", label: "Incidents" },
            { href: "/news", label: "News" },
            { href: "/roads", label: "Roads" },
            { href: "/prepare", label: "Prepare" },
            { href: "/install", label: "Install" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2.5 py-1.5 text-ink-secondary transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ sources }: { sources?: SourceId[] }) {
  const used = sources ?? (["bipad", "usgs", "gdacs", "eonet"] as SourceId[]);
  return (
    <footer className="mt-16 border-t border-edge">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-medium text-ink">Emergency numbers in Nepal</h2>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {EMERGENCY_NUMBERS.map((entry) => (
                <li key={entry.number} className="text-xs text-ink-secondary">
                  {entry.label}{" "}
                  <a
                    href={`tel:${entry.number}`}
                    className="tabular font-medium text-ink underline underline-offset-2"
                  >
                    {entry.number}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-medium text-ink">Data sources</h2>
            <ul className="mt-2.5 space-y-1">
              {used.map((source) => (
                <li key={source} className="text-xs text-ink-secondary">
                  {SOURCE_LABEL[source]}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <nav aria-label="Site" className="mt-8 border-t border-edge pt-5">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { href: "/", label: "Near me" },
              { href: "/incidents", label: "Incident log" },
              { href: "/news", label: "News" },
              { href: "/roads", label: "Roads" },
              { href: "/prepare", label: "What to do" },
              { href: "/install", label: "Install" },
              { href: "/faq", label: "Questions" },
              { href: "/privacy", label: "Privacy" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-xs text-ink-secondary underline-offset-2 hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-6 max-w-prose text-xs text-ink-muted">
          This site aggregates public hazard feeds and is not an official warning
          service. In an emergency, follow instructions from local authorities and
          the National Disaster Risk Reduction and Management Authority. Casualty
          figures are provisional and are revised as reports are verified.
        </p>
      </div>
    </footer>
  );
}
