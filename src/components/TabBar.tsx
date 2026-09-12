"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ListBullets,
  Newspaper,
  Path,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Bottom tab bar, the primary navigation on a phone.
 *
 * The home screen used to carry everything at once, which on a small screen
 * meant scrolling past the map, three charts and a full incident log to reach
 * anything. Splitting it into tabs keeps the answer to "what is near me right
 * now" above the fold, and puts the long reading material one tap away.
 *
 * Sits at the bottom because that is where a thumb is, and because it is the
 * convention every phone user already knows. Hidden on wide screens, where the
 * header navigation is the better fit.
 */
const TABS = [
  { href: "/", label: "Near me", icon: House },
  { href: "/incidents", label: "Incidents", icon: ListBullets },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/roads", label: "Roads", icon: Path },
  { href: "/prepare", label: "Prepare", icon: ShieldCheck },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-page/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          // "/" must match exactly, or it would light up on every page.
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors"
                style={{ color: active ? "var(--ink)" : "var(--ink-muted)" }}
              >
                <tab.icon size={21} weight={active ? "fill" : "regular"} aria-hidden />
                <span className="text-[10px] leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
