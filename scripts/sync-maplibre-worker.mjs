/**
 * Copy MapLibre's CSP worker bundle into /public so it is served from a known,
 * same-origin URL.
 *
 * Two reasons this exists rather than letting the bundler handle it:
 *
 * 1. MapLibre's default build creates its worker from a blob: URL, which would
 *    force `worker-src blob:` into our Content-Security-Policy. The CSP build
 *    loads the worker from a plain URL instead, so `worker-src 'self'` is
 *    enough.
 * 2. Bundler-resolved worker URLs are fragile. Turbopack silently fails to
 *    emit the worker chunk, and the symptom is brutal to diagnose: the style
 *    and sprite load fine on the main thread, no error is raised anywhere, and
 *    the map just sits blank having never requested a single tile.
 *
 * Runs on postinstall and prebuild so the copy can never drift from the
 * installed version.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

const WORKER_FILE = "maplibre-gl-csp-worker.js";
const OUT_DIR = join(process.cwd(), "public", "maplibre");

const pkgPath = require.resolve("maplibre-gl/package.json");
const distDir = join(dirname(pkgPath), "dist");
const { version } = JSON.parse(await readFile(pkgPath, "utf8"));

await mkdir(OUT_DIR, { recursive: true });
await copyFile(join(distDir, WORKER_FILE), join(OUT_DIR, WORKER_FILE));

// Recorded so a version bump shows up in a diff rather than going stale silently.
await writeFile(
  join(OUT_DIR, "VERSION"),
  `maplibre-gl ${version}\nCopied by scripts/sync-maplibre-worker.mjs. Do not edit by hand.\n`,
  "utf8",
);

console.log(`synced maplibre-gl ${version} CSP worker into public/maplibre`);
