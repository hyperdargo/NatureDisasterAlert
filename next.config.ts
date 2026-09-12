import type { NextConfig } from "next";

/**
 * Static security headers. The Content-Security-Policy is set per request in
 * middleware.ts instead, because it carries a fresh nonce each time.
 */
const securityHeaders = [
  // Never let a browser second-guess a declared content type.
  { key: "x-content-type-options", value: "nosniff" },
  // Defence in depth alongside CSP's frame-ancestors.
  { key: "x-frame-options", value: "DENY" },
  { key: "referrer-policy", value: "strict-origin-when-cross-origin" },
  {
    key: "strict-transport-security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Geolocation is the one capability this app needs, and only for itself.
    // Everything else is switched off rather than left at the browser default.
    key: "permissions-policy",
    value: [
      "geolocation=(self)",
      "camera=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "accelerometer=()",
      "gyroscope=()",
      "interest-cohort=()",
    ].join(", "),
  },
  { key: "cross-origin-opener-policy", value: "same-origin" },
  { key: "x-dns-prefetch-control", value: "off" },
];

/**
 * Changes on every build, and is used to name the service worker caches.
 *
 * The caches were previously called "shell-v1" forever. A browser, and more
 * importantly an installed Android app, therefore kept serving the previous
 * build's JavaScript from cache after an update, because WebView storage
 * survives an APK upgrade. The app looked updated and ran old code.
 */
const BUILD_ID = process.env.BUILD_ID ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  poweredByHeader: false,
  reactStrictMode: true,
  // Opt-in, because "next start" refuses to run against a standalone build.
  // The Docker image sets this and runs node server.js; every other way of
  // running the app keeps working with npm start.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Source maps would ship the readable source of every component to any
  // visitor who opens devtools, and roughly double the transferred bytes.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Android needs the right content type to offer the install prompt,
        // and some proxies serve an unknown extension as plain text.
        source: "/app/:file*.apk",
        headers: [
          { key: "content-type", value: "application/vnd.android.package-archive" },
          {
            key: "content-disposition",
            value: 'attachment; filename="nature-disaster-alert.apk"',
          },
          // Long-lived: a new build changes nothing about this path, so the
          // cache is busted by redeploying rather than by a query string.
          { key: "cache-control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Android looks for this exact path to verify the APK owns this
        // domain. A dot-prefixed directory under app/ is not routable, so it
        // is served from a normal route handler behind a rewrite.
        source: "/.well-known/assetlinks.json",
        destination: "/api/assetlinks",
      },
    ];
  },
};

export default nextConfig;
