"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import globe from "@/data/globe.json";
import { countryInfo } from "@/lib/countries";
import { SEVERITY_STYLE } from "@/lib/display";
import type { Severity } from "@/lib/types";

/**
 * The home screen's globe: every land dot of Earth, the reader's country lit,
 * and every hazard the feeds are tracking plotted where it is.
 *
 * Why it moves, in story terms:
 *   - It turns to face your country because the page has just worked out
 *     where you are; the turn is that answer arriving.
 *   - Hazards glow because they are live, and the graver ones pulse, slowly,
 *     so the eye finds them without the page shouting.
 *   - Scrolling dives it down onto your country, which is where the map
 *     below picks up. Scroll back and it pulls out again.
 *
 * It is decoration around an answer, never the answer. The status text sits
 * in HTML beside it and renders before any of this draws.
 *
 * Budget: one canvas, batched paths (one fill per colour per frame), device
 * pixel ratio capped at 1.75, paused off screen and in background tabs, and a
 * single static draw when motion is reduced or the screen is small.
 */
export interface GlobePoint {
  id: string;
  lat: number;
  lon: number;
  severity: Severity;
}

interface GlobeProps {
  country: string | null;
  points: GlobePoint[];
  viewer: { lat: number; lon: number } | null;
  /** Dive progress 0..1, written by the scroll hook, read every frame. */
  dive: MutableRefObject<number>;
  /** Continuous animation (intro, pulse, eased turn). Off: draw on change only. */
  animate: boolean;
  /** Where the globe sits before the dive, as fractions of the stage. */
  anchor: { x: number; y: number; radius: number };
  label: string;
}

const RAD = Math.PI / 180;
const DPR_CAP = 1.75;
const INTRO_MS = 1400;

/** Decoded once for the whole app. */
const LAND = (() => {
  const step = globe.step;
  let count = 0;
  for (const row of globe.rows) count += (row.length - 2) / 2;
  const sinLat = new Float32Array(count);
  const cosLat = new Float32Array(count);
  const lon = new Float32Array(count);
  const owner = new Uint16Array(count);
  const jitter = new Float32Array(count);
  let i = 0;
  for (const row of globe.rows) {
    const lat = (-90 + step / 2 + row[0] * step) * RAD;
    const lonCount = row[1];
    for (let k = 2; k < row.length; k += 2) {
      sinLat[i] = Math.sin(lat);
      cosLat[i] = Math.cos(lat);
      lon[i] = (-180 + (360 / lonCount) * (row[k] + 0.5)) * RAD;
      owner[i] = row[k + 1];
      // Deterministic scatter for the intro, so every load assembles the same.
      jitter[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
      i++;
    }
  }
  return { count, sinLat, cosLat, lon, owner, jitter };
})();

const SEVERITY_RANK: Record<Severity, number> = { good: 0, warning: 1, serious: 2, critical: 3 };

function sprite(color: string): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(0.35, `${color}88`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Shortest signed angular difference, so a turn never goes the long way. */
function angleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function Globe({ country, points, viewer, dive, animate, anchor, label }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ownerIndex = useMemo(
    () => (country ? globe.countries.indexOf(country) : -1),
    [country],
  );
  const info = useMemo(() => (country ? countryInfo(country) : null), [country]);

  // Everything the frame loop reads lives in refs, so new data never restarts it.
  const state = useRef({
    points: [] as Array<
      GlobePoint & { sinLat: number; cosLat: number; lonRad: number; phase: number; weight: number }
    >,
    viewer: null as GlobeProps["viewer"],
    target: { lon: 20, lat: 15 },
    zoom: 1,
    ownerIndex: -1,
    dirty: true,
  });

  useEffect(() => {
    const s = state.current;
    // One mark per ~1.5 degree cell, carrying the gravest severity in it.
    // Nepal alone logs hundreds of incidents a month; drawn one by one and
    // blended additively they burn out to a white smear that says nothing.
    const cells = new Map<string, GlobePoint & { count: number }>();
    for (const point of points) {
      const key = `${Math.round(point.lat / 1.5)}:${Math.round(point.lon / 1.5)}`;
      const cell = cells.get(key);
      if (!cell) {
        cells.set(key, { ...point, count: 1 });
      } else {
        cell.count += 1;
        if (SEVERITY_RANK[point.severity] > SEVERITY_RANK[cell.severity]) {
          cell.severity = point.severity;
          cell.lat = point.lat;
          cell.lon = point.lon;
        }
      }
    }
    s.points = [...cells.values()]
      // Graver marks draw last, on top.
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
      .map((point, index) => ({
        ...point,
        sinLat: Math.sin(point.lat * RAD),
        cosLat: Math.cos(point.lat * RAD),
        lonRad: point.lon * RAD,
        phase: index * 0.7,
        weight: Math.min(1.8, 1 + Math.log10(point.count) * 0.35),
      }));
    s.viewer = viewer;
    s.ownerIndex = ownerIndex;
    if (info) {
      // A slight tilt shows more of the country's surroundings than dead-on.
      s.target = { lon: info.center[0], lat: Math.max(-40, Math.min(40, info.center[1] - 6)) };
      const [minLon, minLat, maxLon, maxLat] = info.bbox;
      // Mainland span; territories would make France the width of the planet.
      const span = Math.min(60, Math.max(4, Math.max(maxLon - minLon, maxLat - minLat)));
      s.zoom = Math.min(18, Math.max(1.6, 0.9 / Math.sin((span / 2) * RAD)));
    }
    s.dirty = true;
  }, [points, viewer, ownerIndex, info]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprites: Record<Severity, HTMLCanvasElement> = {
      critical: sprite(SEVERITY_STYLE.critical.hex),
      serious: sprite(SEVERITY_STYLE.serious.hex),
      warning: sprite(SEVERITY_STYLE.warning.hex),
      good: sprite(SEVERITY_STYLE.good.hex),
    };

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let started = 0;
    let lastTime = 0;
    let lastDive = -1;
    const view = { ...state.current.target };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.current.dirty = true;
      if (!animate) draw(performance.now());
    };

    const draw = (now: number) => {
      if (width === 0) return;
      const s = state.current;
      const dt = lastTime ? Math.min(64, now - lastTime) : 16;
      lastTime = now;

      // Turn towards the country: eased when animating, immediate otherwise.
      if (animate) {
        const k = 1 - Math.exp(-dt / 420);
        view.lon += angleDelta(view.lon, s.target.lon) * k;
        view.lat += (s.target.lat - view.lat) * k;
      } else {
        view.lon = s.target.lon;
        view.lat = s.target.lat;
      }

      const intro = animate ? Math.min(1, (now - started) / INTRO_MS) : 1;
      const introEase = 1 - Math.pow(1 - intro, 3);
      const p = animate ? dive.current : 0;

      // Dive: geometric zoom, so it feels like constant speed towards the ground.
      const zoomT = p * p * (3 - 2 * p);
      const scale = Math.pow(s.zoom, zoomT);
      const baseRadius = Math.min(width, height) * anchor.radius;
      const radius = baseRadius * scale;
      const toCenter = Math.min(1, p * 2);
      const cx = width * (anchor.x + (0.5 - anchor.x) * toCenter);
      const cy = height * (anchor.y + (0.5 - anchor.y) * toCenter);
      const fade = 1 - Math.max(0, (p - 0.72) / 0.28);

      ctx.clearRect(0, 0, width, height);
      if (fade <= 0.001) return;
      ctx.globalAlpha = fade;

      const lon0 = view.lon * RAD;
      const sinLat0 = Math.sin(view.lat * RAD);
      const cosLat0 = Math.cos(view.lat * RAD);

      // Atmosphere: a faint limb so the sphere reads before the dots land.
      // Skipped once the globe outgrows the screen during the dive.
      if (radius < Math.max(width, height)) {
        const limb = ctx.createRadialGradient(cx, cy, radius * 0.86, cx, cy, radius * 1.18);
        limb.addColorStop(0, "rgba(143,211,255,0)");
        limb.addColorStop(0.55, "rgba(143,211,255,0.08)");
        limb.addColorStop(1, "rgba(143,211,255,0)");
        ctx.fillStyle = limb;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
        ctx.fill();
      }

      const dot = Math.max(0.9, Math.min(3.4, baseRadius * 0.0068 * Math.sqrt(scale)));
      // Thousands of land dots are squares, which cost a fraction of an arc
      // and read as dots at this size. The reader's country keeps round ones.
      const land = new Path2D();
      const home = new Path2D();
      const { count, sinLat, cosLat, lon, owner, jitter } = LAND;

      for (let i = 0; i < count; i++) {
        const dLon = lon[i] - lon0;
        const cosD = Math.cos(dLon);
        const depth = sinLat0 * sinLat[i] + cosLat0 * cosLat[i] * cosD;
        if (depth <= 0) continue;
        // Intro: dots fall in from just above the surface, far side first.
        const lift = 1 + (1 - introEase) * (0.25 + jitter[i] * 0.5);
        const x = cx + radius * lift * cosLat[i] * Math.sin(dLon);
        const y = cy - radius * lift * (cosLat0 * sinLat[i] - sinLat0 * cosLat[i] * cosD);
        if (x < -8 || x > width + 8 || y < -8 || y > height + 8) continue;
        const r = dot * (0.45 + 0.55 * depth);
        if (owner[i] === s.ownerIndex) {
          home.moveTo(x + r, y);
          home.arc(x, y, r, 0, Math.PI * 2);
        } else {
          land.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
        }
      }

      ctx.fillStyle = `rgba(150,170,190,${0.34 * introEase})`;
      ctx.fill(land);
      ctx.fillStyle = `rgba(143,211,255,${0.95 * introEase})`;
      ctx.fill(home);

      // Hazards, additive so clusters bloom instead of muddying.
      ctx.globalCompositeOperation = "lighter";
      const pulseClock = now / 1000;
      for (const point of s.points) {
        const dLon = point.lonRad - lon0;
        const cosD = Math.cos(dLon);
        const depth = sinLat0 * point.sinLat + cosLat0 * point.cosLat * cosD;
        if (depth <= 0.02) continue;
        const x = cx + radius * point.cosLat * Math.sin(dLon);
        const y = cy - radius * (cosLat0 * point.sinLat - sinLat0 * point.cosLat * cosD);
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;
        const rank = SEVERITY_RANK[point.severity];
        const pulse =
          animate && rank >= 2 ? 1 + 0.35 * Math.max(0, Math.sin(pulseClock * 1.6 + point.phase)) : 1;
        const size =
          (7 + rank * 5) * point.weight * pulse * Math.min(2.2, Math.sqrt(scale)) * (0.55 + 0.45 * depth);
        ctx.globalAlpha = fade * introEase * (0.55 + 0.45 * depth);
        ctx.drawImage(sprites[point.severity], x - size / 2, y - size / 2, size, size);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = fade;

      // You.
      if (s.viewer) {
        const dLon = s.viewer.lon * RAD - lon0;
        const vs = Math.sin(s.viewer.lat * RAD);
        const vc = Math.cos(s.viewer.lat * RAD);
        const depth = sinLat0 * vs + cosLat0 * vc * Math.cos(dLon);
        if (depth > 0) {
          const x = cx + radius * vc * Math.sin(dLon);
          const y = cy - radius * (cosLat0 * vs - sinLat0 * vc * Math.cos(dLon));
          ctx.strokeStyle = "#8fd3ff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      s.dirty = false;
      lastDive = p;
    };

    const loop = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!animate) {
        draw(performance.now());
        return;
      }
      if (!frame) frame = requestAnimationFrame(loop);
    };

    started = performance.now();
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    intersection.observe(canvas);

    const onVisibility = () => {
      if (!document.hidden) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Without continuous animation, redraw only when the data changes.
    const poll = animate
      ? 0
      : window.setInterval(() => {
          if (state.current.dirty || dive.current !== lastDive) draw(performance.now());
        }, 250);

    start();

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(poll);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [animate, anchor.x, anchor.y, anchor.radius, dive]);

  return <canvas ref={canvasRef} role="img" aria-label={label} className="block h-full w-full" />;
}
