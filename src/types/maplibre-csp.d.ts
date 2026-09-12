/**
 * MapLibre's CSP build ships no type declarations of its own. It exposes the
 * same runtime surface as the default entrypoint, differing only in how the
 * web worker is loaded, so it is declared as an alias of the typed module.
 */
declare module "maplibre-gl/dist/maplibre-gl-csp" {
  import type * as maplibregl from "maplibre-gl";
  export = maplibregl;
}
