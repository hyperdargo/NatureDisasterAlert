import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request Content-Security-Policy with a fresh nonce.
 *
 * Next 16 renamed the middleware entrypoint to `proxy`; the behaviour is the
 * same request interception it has always been.
 *
 * A nonce beats `unsafe-inline` for scripts: an injected <script> cannot guess
 * the nonce, so a stray XSS payload will not execute even if markup escaping
 * fails somewhere. `strict-dynamic` lets Next's nonced bootstrap load its own
 * chunks without listing every hashed filename.
 *
 * Honest caveat: style-src still allows inline styles. Tailwind's injected
 * styles, next/font, and MapLibre's element style attributes all require it.
 * Inline CSS is a far smaller risk surface than inline script, and locking it
 * down would break rendering, so the tradeoff is deliberate rather than an
 * oversight.
 */
const TILE_HOST = "https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com";

export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    `default-src 'self'`,
    // Dev needs eval for hot reloading; production does not get it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${TILE_HOST}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${TILE_HOST}${isDev ? " ws: http://localhost:*" : ""}`,
    // MapLibre's tile parser runs in a worker served from our own origin,
    // so blob: workers need not be allowed at all.
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    isDev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets; they need no per-request nonce.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
