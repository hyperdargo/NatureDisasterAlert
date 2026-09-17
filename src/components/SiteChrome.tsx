"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { useCountry } from "./CountryProvider";
import { CHECKED_ON, numbersFor } from "@/lib/countries/emergency";
import { profileFor } from "@/lib/countries/profiles";

const NAV = [
  { href: "/", label: "Near me" },
  { href: "/incidents", label: "Incidents" },
  { href: "/news", label: "News" },
  { href: "/roads", label: "Roads", roadsOnly: true },
  { href: "/prepare", label: "Prepare" },
  { href: "/install", label: "Install" },
] as const;

/**
 * A floating bar: mark, country, sections. The country sits in the bar on
 * every page because it decides the emergency numbers, and a reader must be
 * able to see and change it without looking for a setting.
 */
export function SiteHeader() {
  const country = useCountry();
  const pathname = usePathname();
  const roads = country.code ? profileFor(country.code).roads : false;

  return (
    <header
      className="sticky top-0 z-30 px-3 pt-3"
      // Clears the status bar on a phone with a notch or in fullscreen.
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 rounded-full border border-edge bg-page/70 pr-2 pl-3 backdrop-blur-xl">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Nature Disaster Alert, home">
          <Image src="/logo-badge.png" alt="" width={30} height={30} className="shrink-0" priority />
          <span className="hidden truncate text-sm font-semibold tracking-tight sm:block">
            Disaster Alert
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 text-sm lg:flex" aria-label="Main">
          {NAV.filter((item) => !("roadsOnly" in item) || roads).map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  active ? "bg-raised text-ink" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={country.openPicker}
          className="press ml-auto flex min-h-10 items-center gap-2 rounded-full border border-edge px-3 text-sm hover:border-edge-strong"
          aria-label={country.info ? `Country: ${country.info.name}. Change country` : "Choose your country"}
        >
          {country.code ? (
            <>
              <span aria-hidden className="readout rounded bg-raised px-1.5 py-0.5 text-ink-secondary">
                {country.code}
              </span>
              <span className="max-w-[9rem] truncate">{country.info?.name}</span>
            </>
          ) : (
            <span className="text-ink-secondary">Choose country</span>
          )}
          <CaretDown size={12} className="text-ink-muted" aria-hidden />
        </button>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const country = useCountry();
  const numbers = numbersFor(country.code);
  const profile = country.code ? profileFor(country.code) : null;

  return (
    <footer className="mt-24 border-t border-edge">
      <div className="mx-auto max-w-[1400px] px-[var(--gutter)] pt-12 pb-40 md:pb-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h2 className="readout">
              Emergency numbers{country.info ? ` · ${country.info.name}` : ""}
            </h2>
            {numbers ? (
              <>
                <ul className="mt-3 space-y-1.5">
                  {numbers.primary.map((line) => (
                    <li key={`${line.label}-${line.number}`} className="text-sm text-ink-secondary">
                      {line.label}{" "}
                      <a href={`tel:${line.number}`} className="tabular font-semibold text-ink underline underline-offset-2">
                        {line.number}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-muted">
                  {numbers.tier === "checked"
                    ? `Checked against ${numbers.sourceName} on ${CHECKED_ON}.`
                    : "From a public compiled list, not an official source. Confirm locally."}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-secondary">
                {country.code ? "No verified numbers for this country." : "Choose a country to see its numbers."}
              </p>
            )}
          </div>

          <div>
            <h2 className="readout">Data sources</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-secondary">
              {profile?.official && <li>{`${profile.official.name}, ${profile.official.publisher}`}</li>}
              <li>USGS Earthquake Hazards Program</li>
              <li>GDACS, European Commission</li>
              <li>NASA Earth Observatory (EONET)</li>
              <li>OpenStreetMap contributors</li>
            </ul>
          </div>

          <nav aria-label="Site">
            <h2 className="readout">Pages</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {[
                { href: "/", label: "Near me" },
                { href: "/incidents", label: "Incident log" },
                { href: "/news", label: "News" },
                ...(profile?.roads ? [{ href: "/roads", label: "Roads" }] : []),
                { href: "/prepare", label: "What to do" },
                { href: "/install", label: "Install" },
                { href: "/faq", label: "Questions" },
                { href: "/privacy", label: "Privacy" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-ink-secondary hover:text-ink hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-12 max-w-[60rem] text-xs leading-relaxed text-ink-muted">
          This site gathers public hazard feeds and is not an official warning service. In an
          emergency, follow instructions from local authorities. Casualty figures are provisional
          and revised as reports are verified. Nature Disaster Alert by DTEmpire.
        </p>
      </div>
    </footer>
  );
}
