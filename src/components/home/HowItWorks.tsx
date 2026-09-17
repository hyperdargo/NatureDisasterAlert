"use client";

import { useRef } from "react";
import { passing, smoothstep, useScrollProgress } from "@/hooks/useScroll";

/**
 * How a warning reaches this screen, drawn as the reader scrolls.
 *
 * The line exists to make one claim visible: the data travels towards the
 * phone, and the reader's position does not travel back. The last stop lights
 * up with that sentence at the moment the line reaches it.
 */
export function HowItWorks({
  officialName,
}: {
  officialName: string | null;
}) {
  const section = useRef<HTMLElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const stops = useRef<Array<HTMLLIElement | null>>([]);

  useScrollProgress(
    section,
    (progress) => {
      // Draws across the middle of the section's pass through the viewport.
      const drawn = smoothstep(0.22, 0.62, progress);
      if (line.current) line.current.style.setProperty("--drawn", String(drawn));
      stops.current.forEach((stop, index) => {
        if (!stop) return;
        const reached = drawn >= index / 2 - 0.001;
        stop.dataset.reached = String(reached);
      });
    },
    passing,
  );

  const STOPS = [
    {
      label: "Public feeds",
      title: officialName ? `${officialName}, USGS, GDACS, NASA` : "USGS, GDACS, NASA",
      body: "Earthquakes, cyclones, floods, fires and official warnings, pulled every few minutes. No API keys, no private data.",
    },
    {
      label: "This server",
      title: "Checked, merged, cached",
      body: "Every record is validated, duplicates across feeds are merged, and a missing figure stays missing instead of becoming zero.",
    },
    {
      label: "Your phone",
      title: "Distance is worked out here",
      body: "Your position stays on your device. Only the hospital search sends one, rounded to about a kilometre, and nothing is stored.",
    },
  ];

  return (
    <section
      ref={section}
      aria-labelledby="how-heading"
      className="mx-auto w-full max-w-[1400px] px-[var(--gutter)] pt-28"
    >
      <h2 id="how-heading" className="display text-[clamp(1.9rem,4vw,3.2rem)]">
        How a warning gets here
      </h2>

      {/* The track is a sibling of the list: an <ol> may only hold items. */}
      <div className="how relative mt-12">
        <span aria-hidden className="how-track">
          <span ref={line} className="how-line" />
        </span>
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        {STOPS.map((stop, index) => (
          <li
            key={stop.label}
            ref={(element) => {
              stops.current[index] = element;
            }}
            data-reached="false"
            className="how-stop relative pl-10 md:pt-10 md:pl-0"
          >
            <span aria-hidden className="how-node" />
            <p className="readout">{stop.label}</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">{stop.title}</h3>
            <p className="mt-2 max-w-[24rem] text-sm leading-relaxed text-ink-secondary">{stop.body}</p>
          </li>
        ))}
        </ol>
      </div>
    </section>
  );
}
