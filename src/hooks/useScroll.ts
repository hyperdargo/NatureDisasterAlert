"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/**
 * A media query as an external store. The server snapshot is false, so the
 * first client render matches the server HTML and the real value arrives right
 * after hydration instead of causing a mismatch.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * How far an element has travelled through the viewport, 0 to 1, delivered to
 * a callback on animation frames rather than through React state, so a scroll
 * never re-renders a component.
 *
 * `measure` turns the element's rect and the viewport height into progress.
 * Two shapes cover every section on the site:
 *
 *   pinned   0 when the top reaches the top of the viewport, 1 when the
 *            bottom reaches the bottom. For sticky stages.
 *   passing  0 when the top enters at the bottom, 1 when the bottom leaves at
 *            the top. For things that simply scroll by.
 *
 * Progress is a pure function of scroll position, so scrubbing backwards
 * replays every state in reverse.
 */
export type Measure = (rect: DOMRect, viewport: number) => number;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const pinned: Measure = (rect, viewport) => {
  const travel = rect.height - viewport;
  return travel <= 0 ? 0 : clamp(-rect.top / travel);
};

export const passing: Measure = (rect, viewport) =>
  clamp((viewport - rect.top) / (viewport + rect.height));

export function useScrollProgress(
  target: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
  measure: Measure = pinned,
) {
  // Latest callback without resubscribing on every render.
  const callback = useRef(onProgress);
  useEffect(() => {
    callback.current = onProgress;
  });

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    let frame = 0;
    let last = -1;

    const update = () => {
      frame = 0;
      const progress = measure(element.getBoundingClientRect(), window.innerHeight);
      if (progress !== last) {
        last = progress;
        callback.current(progress);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [target, measure]);
}

/** Hermite smoothstep between two progress marks. */
export function smoothstep(from: number, to: number, value: number): number {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}
