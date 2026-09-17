"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { REDUCED_MOTION, useMediaQuery, useScrollProgress } from "@/hooks/useScroll";
import { fillNumber, guidesFor } from "@/lib/guides";
import type { HazardKind } from "@/lib/types";

/**
 * What to do, as a pinned horizontal gallery.
 *
 * The guides are peers, one per hazard, so they sit side by side and the
 * vertical scroll walks along them. The card nearest the centre is full size
 * and the rest recede, which keeps one set of instructions readable at a time.
 * Guides for hazards reported in the country this month come first.
 *
 * Phones and reduced motion: a native swipe rail with snap points and no pin.
 */
export function GuideGallery({
  activeKinds,
  countryName,
  number,
}: {
  activeKinds: HazardKind[];
  countryName: string | null;
  number: string | null;
}) {
  const guides = useMemo(() => guidesFor(activeKinds), [activeKinds]);
  const active = useMemo(() => new Set(activeKinds), [activeKinds]);
  // Only claim a reordering when a guide actually matched something reported.
  const anyActive = guides.some((guide) => guide.kinds.some((kind) => active.has(kind)));

  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  const reduced = useMediaQuery(REDUCED_MOTION);
  const wide = useMediaQuery("(min-width: 1024px) and (min-height: 640px)");
  const pinned = wide && !reduced;

  // Measure how far the track runs past the viewport; that is the scroll
  // distance the pin needs. Re-measured on resize.
  useEffect(() => {
    const element = track.current;
    if (!pinned || !element) return;
    const measure = () => {
      const gutter = parseFloat(getComputedStyle(element).paddingLeft) || 0;
      // Twice the gutter, so the last item finishes clear of the edge.
      setOverflow(Math.max(0, element.scrollWidth - window.innerWidth + gutter * 2));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned, guides]);

  useScrollProgress(section, (progress) => {
    const element = track.current;
    if (!element) return;
    if (!pinned) {
      element.style.transform = "";
      [...element.children].forEach((child) => {
        (child as HTMLElement).style.transform = "";
        (child as HTMLElement).style.opacity = "";
      });
      return;
    }
    element.style.transform = `translate3d(${-progress * overflow}px, 0, 0)`;
    const centre = window.innerWidth / 2;
    let nearest = 0;
    let nearestDistance = Infinity;
    [...element.children].forEach((child, index) => {
      const card = child as HTMLElement;
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - centre) / window.innerWidth;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
      const t = Math.min(1, distance * 1.6);
      card.style.transform = `scale(${1 - t * 0.08})`;
      card.style.opacity = String(1 - t * 0.45);
    });
    if (counter.current) {
      counter.current.textContent = `${String(nearest + 1).padStart(2, "0")} / ${String(guides.length).padStart(2, "0")}`;
    }
    if (rail.current) rail.current.style.transform = `scaleX(${Math.max(0.04, progress)})`;
  });

  return (
    <section
      ref={section}
      aria-labelledby="guides-heading"
      className="relative mt-28"
      style={pinned && overflow > 0 ? { height: `calc(100dvh + ${overflow}px)` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-[100dvh] flex-col justify-center overflow-hidden" : ""}>
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-end justify-between gap-4 px-[var(--gutter)]">
          <div>
            <h2 id="guides-heading" className="display text-[clamp(1.9rem,4vw,3.2rem)]">
              What to do
            </h2>
            <p className="mt-3 max-w-[34rem] text-base text-ink-secondary">
              {countryName && anyActive
                ? `Hazards reported in ${countryName} this month come first. Local authorities' instructions always come before this.`
                : "General guidance that holds almost anywhere. Local authorities' instructions always come before this."}
            </p>
          </div>
          {pinned && (
            <div className="flex items-center gap-4">
              <span ref={counter} className="readout tabular text-ink-secondary">
                01 / {String(guides.length).padStart(2, "0")}
              </span>
              <span className="relative block h-px w-32 bg-edge" aria-hidden>
                <span ref={rail} className="absolute inset-0 origin-left bg-ice" style={{ transform: "scaleX(0.04)" }} />
              </span>
            </div>
          )}
        </div>

        <ol
          ref={track}
          className={`mt-8 flex gap-4 px-[var(--gutter)] ${
            pinned
              ? "will-change-transform"
              : "rail snap-x snap-mandatory scroll-px-[var(--gutter)] overflow-x-auto pb-4"
          }`}
          aria-label="Hazard guides"
        >
          {guides.map((guide) => {
            const now = guide.kinds.some((kind) => active.has(kind));
            return (
              <li
                key={guide.id}
                className="flex w-[min(84vw,26rem)] shrink-0 snap-start flex-col rounded-3xl border border-edge bg-surface p-6 transition-[border-color] lg:w-[30rem] lg:p-8"
                style={now ? { borderColor: "var(--border-strong)" } : undefined}
              >
                {now && (
                  <p className="readout mb-3 flex items-center gap-2 text-ice">
                    <span className="live-dot" aria-hidden /> Reported in {countryName ?? "your country"} this month
                  </p>
                )}
                <h3 className="display text-[clamp(1.6rem,2.6vw,2.2rem)]">{guide.hazard}</h3>
                <p className="mt-2 text-sm text-ink-secondary">{guide.when}</p>
                <ol className="mt-5 space-y-2.5">
                  {guide.during.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink">
                      <span className="readout tabular mt-0.5 shrink-0 text-ice" aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {fillNumber(step, number)}
                    </li>
                  ))}
                </ol>
                <p className="readout mt-6 text-critical">Never</p>
                <ul className="mt-2 space-y-1.5">
                  {guide.never.slice(0, 2).map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-ink-secondary">
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
          <li className="flex w-[min(70vw,18rem)] shrink-0 snap-start items-center">
            <Link
              href="/prepare"
              className="press inline-flex items-center gap-2 rounded-full border border-edge-strong px-5 py-3 text-sm text-ink hover:bg-raised"
            >
              All guides and an emergency kit list <ArrowRight size={14} aria-hidden />
            </Link>
          </li>
        </ol>
      </div>
    </section>
  );
}
