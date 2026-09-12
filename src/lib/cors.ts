import { NextResponse } from "next/server";

/**
 * CORS for the packaged Android app.
 *
 * The app bundles the interface into the APK, so the WebView serves it from a
 * local origin (https://localhost on Android, capacitor://localhost on iOS)
 * while the data still comes from the deployed site. Those requests are
 * therefore cross-origin, and without these headers the browser blocks them.
 *
 * The allowlist is explicit rather than "*", so this does not quietly become
 * an open API that any website can call from a visitor's browser. There are no
 * credentials or cookies involved either way; the API exposes only public
 * hazard data.
 */
const ALLOWED_ORIGINS = new Set([
  // Android WebView with Capacitor's default scheme.
  "https://localhost",
  // iOS WebView, if the project is ever built for it.
  "capacitor://localhost",
  "ionic://localhost",
  // Local development of the packaged shell.
  "http://localhost:3000",
  "http://localhost:3100",
]);

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    // Tell caches the response varies by origin, so one origin's response is
    // never replayed to another.
    vary: "Origin",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

/** Shared preflight handler for the API routes. */
export function handleOptions(request: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
