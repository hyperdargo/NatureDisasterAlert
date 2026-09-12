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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Emits a self-contained server with only the modules actually imported,
  // which is what the Docker image copies instead of all of node_modules.
  output: "standalone",
  // Source maps would ship the readable source of every component to any
  // visitor who opens devtools, and roughly double the transferred bytes.
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
