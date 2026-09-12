import { NextResponse } from "next/server";

/**
 * Content-Security-Policy for every response.
 *
 * Next 16 renamed the middleware entrypoint to `proxy`; the behaviour is the
 * same request interception it has always been.
 *
 * This used to mint a per-request nonce and pair it with `strict-dynamic`,
 * which is the stronger policy. It was silently breaking the entire site.
 *
 * Next only stamps a nonce onto script tags while rendering a page, and these
 * pages are static or incrementally regenerated: their HTML is produced once
 * and served to everyone. The proxy, meanwhile, minted a fresh nonce per
 * request. The two could never match, so no script carried a valid nonce, and
 * because `strict-dynamic` causes browsers to ignore `self`, every script on
 * the page was blocked. React never booted. The result looked like a working
 * site with dead buttons: nothing was clickable, no effect ever ran, and
 * panels that fetch on mount sat on their loading state forever.
 *
 * Nonces would require `force-dynamic` on every page, which cannot coexist
 * with the static export that the Android app is built from. So scripts are
 * allowed by origin instead.
 *
 * What that costs, stated plainly: `unsafe-inline` permits an injected inline
 * script to run, which a nonce would have stopped. The mitigations that
 * remain are real but they are not equivalent: no user-supplied content is
 * ever rendered as HTML, the one place upstream text reaches markup escapes
 * it first (see HazardMap), `object-src` is none, `base-uri` and `form-action`
 * are locked to self, and framing is refused outright.
 */
const TILE_HOST = "https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com";

export default function proxy() {
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    `default-src 'self'`,
    // Next streams its RSC payload through inline scripts, which have no
    // nonce on a statically rendered page. Dev additionally needs eval for
    // React's enhanced error reporting; production does not get it.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
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

  const response = NextResponse.next();
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
