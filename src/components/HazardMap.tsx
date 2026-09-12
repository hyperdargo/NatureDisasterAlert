"use client";

import { useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { NEPAL_CENTER } from "@/lib/geo";
import { SEVERITY_STYLE } from "@/lib/display";
import type { Coords } from "@/hooks/useGeolocation";
import type { DisasterEvent } from "@/lib/types";

/**
 * CARTO's basemaps are free and keyless, which keeps the app runnable by
 * anyone who clones it. Tiles are the one thing the browser fetches from a
 * third party; they are public static images and carry no user data beyond
 * the area being viewed.
 */
const STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

const SOURCE_ID = "hazards";
const USER_SOURCE_ID = "viewer";

/**
 * Data-driven paint, so 500 points stay on the GPU instead of in the DOM.
 * These use resolved hex, not CSS variables: the map paints to a canvas and
 * MapLibre resolves colours itself, so `var(--...)` would throw on addLayer.
 */
const SEVERITY_COLOR: ExpressionSpecification = [
  "match",
  ["get", "severity"],
  "critical",
  SEVERITY_STYLE.critical.hex,
  "serious",
  SEVERITY_STYLE.serious.hex,
  "warning",
  SEVERITY_STYLE.warning.hex,
  SEVERITY_STYLE.good.hex,
];

const SEVERITY_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  ["match", ["get", "severity"], "critical", 7, "serious", 5.5, 4],
  10,
  ["match", ["get", "severity"], "critical", 16, "serious", 13, 9],
];

const POINT_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  ["match", ["get", "severity"], "critical", 3.5, "serious", 2.75, 2],
  10,
  ["match", ["get", "severity"], "critical", 7.5, "serious", 6, 4.5],
];

function toFeatureCollection(events: DisasterEvent[]) {
  return {
    type: "FeatureCollection" as const,
    features: events.map((e) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [e.lon, e.lat] },
      properties: {
        id: e.id,
        severity: e.severity,
        title: e.title,
        place: e.place ?? "",
        metric: e.metric ?? "",
        dead: e.casualties.dead ?? -1,
        injured: e.casualties.injured ?? -1,
      },
    })),
  };
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Popup markup is assembled as an HTML string and event titles come straight
 * from upstream feeds, so every interpolated value is escaped first.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

export function HazardMap({
  events,
  viewer,
}: {
  events: DisasterEvent[];
  viewer: Coords | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const centred = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * Hold the 930 KB MapLibre bundle back until the map is actually on screen.
   *
   * The map sits below the proximity list and the headline figures, which are
   * the parts that matter when someone opens this during an emergency.
   * Downloading nearly a megabyte before "a landslide was reported 4 km away"
   * can render is the wrong order, especially on a phone on a slow connection,
   * which is exactly the situation this app exists for.
   */
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      // Ancient browser: load immediately rather than never. Deferred off the
      // effect body so it does not cascade a second render before first paint.
      const timer = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      // Start fetching slightly before it scrolls in, so the map is usually
      // ready by the time it is looked at.
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    if (!container.current || map.current) return;
    let cancelled = false;
    let instance: MapLibreMap | null = null;

    const init = async () => {
      // The CSP build loads its worker from a URL instead of a blob, which is
      // what lets the policy stay at `worker-src 'self'`. It ships without its
      // own types, so it is cast to the typed entrypoint it mirrors.
      // Imported lazily so MapLibre never executes during server rendering.
      const maplibregl = (await import(
        "maplibre-gl/dist/maplibre-gl-csp"
      )) as unknown as typeof import("maplibre-gl");
      const { Map, Popup, NavigationControl, setWorkerUrl } = maplibregl;
      if (cancelled || !container.current) return;

      // Point at the copy in /public rather than a bundler-resolved URL.
      // See scripts/sync-maplibre-worker.mjs for why.
      setWorkerUrl("/maplibre/maplibre-gl-csp-worker.js");

      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
      const ringColor = prefersDark ? "#1a1a19" : "#fcfcfb";

      // A non-null local keeps every handler below correctly narrowed.
      const mapInstance = new Map({
        container: container.current,
        style: prefersDark ? STYLES.dark : STYLES.light,
        center: [NEPAL_CENTER.lon, NEPAL_CENTER.lat],
        zoom: 6,
        attributionControl: { compact: true },
      });
      instance = mapInstance;
      map.current = mapInstance;

      mapInstance.addControl(
        new NavigationControl({ showCompass: false }),
        "top-right",
      );
      mapInstance.on("error", (event) => console.error("map error:", event?.error ?? event));

      mapInstance.on("load", () => {
        if (cancelled) return;

        mapInstance.addSource(SOURCE_ID, { type: "geojson", data: toFeatureCollection([]) });

        // A soft halo gives low-severity marks presence without inflating them.
        mapInstance.addLayer({
          id: "hazard-halo",
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": SEVERITY_RADIUS,
            "circle-color": SEVERITY_COLOR,
            "circle-opacity": 0.18,
            "circle-blur": 0.6,
          },
        });
        mapInstance.addLayer({
          id: "hazard-point",
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": POINT_RADIUS,
            "circle-color": SEVERITY_COLOR,
            // A ring in the surface colour separates overlapping marks.
            "circle-stroke-width": 1.5,
            "circle-stroke-color": ringColor,
          },
        });

        mapInstance.addSource(USER_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: "viewer-point",
          type: "circle",
          source: USER_SOURCE_ID,
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#2a78d6",
          },
        });

        const popup = new Popup({ closeButton: true, maxWidth: "280px" });

        mapInstance.on("click", "hazard-point", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const props = feature.properties as Record<string, string | number>;
          const dead = Number(props.dead);
          const injured = Number(props.injured);

          const lossParts = [
            dead > 0 ? `${dead} died` : null,
            injured > 0 ? `${injured} injured` : null,
          ].filter(Boolean);

          const rows = [
            `<p style="margin:0;font-size:13px;font-weight:500">${escapeHtml(String(props.title))}</p>`,
            props.place
              ? `<p style="margin:3px 0 0;font-size:12px;opacity:.7">${escapeHtml(String(props.place))}</p>`
              : "",
            props.metric
              ? `<p style="margin:3px 0 0;font-size:12px;opacity:.7">${escapeHtml(String(props.metric))}</p>`
              : "",
            lossParts.length
              ? `<p style="margin:6px 0 0;font-size:12px;color:${SEVERITY_STYLE.critical.hex}">${lossParts.join(" · ")}</p>`
              : "",
          ].join("");

          popup
            .setLngLat(event.lngLat)
            .setHTML(`<div style="padding:10px 12px">${rows}</div>`)
            .addTo(mapInstance);
        });

        mapInstance.on("mouseenter", "hazard-point", () => {
          mapInstance.getCanvas().style.cursor = "pointer";
        });
        mapInstance.on("mouseleave", "hazard-point", () => {
          mapInstance.getCanvas().style.cursor = "";
        });

        setReady(true);
      });
    };

    init().catch((error) => {
      console.error("map failed to initialise:", error);
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
    };
  }, [inView]);

  // Push updates into the existing source rather than rebuilding layers.
  useEffect(() => {
    if (!ready || !map.current) return;
    const source = map.current.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(events));
  }, [events, ready]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const source = map.current.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: viewer
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [viewer.lon, viewer.lat] },
              properties: {},
            },
          ]
        : [],
    });
  }, [viewer, ready]);

  // Centre on the viewer once, then leave their pan and zoom alone.
  useEffect(() => {
    if (!ready || !map.current || !viewer || centred.current) return;
    centred.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.current.flyTo({
      center: [viewer.lon, viewer.lat],
      zoom: 9,
      duration: reduceMotion ? 0 : 1400,
    });
  }, [viewer, ready]);

  if (failed) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-edge bg-surface p-6 text-center text-sm text-ink-secondary">
        The map could not load. The hazard list below still works.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-edge bg-surface">
      <div ref={container} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-surface">
          <p className="text-xs text-ink-muted">
            {inView ? "Loading map" : "Map loads when you scroll to it"}
          </p>
        </div>
      )}
    </div>
  );
}
