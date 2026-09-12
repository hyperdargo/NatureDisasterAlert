import type { MetadataRoute } from "next";

// These never vary per request, and the static export requires saying so.
export const dynamic = "force-static";
import { SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Crawlers are welcome on the pages, but not on the API.
 *
 * The API routes proxy several rate-limited upstreams. A crawler walking them
 * would burn that budget for nobody's benefit, and the same data is already
 * rendered into the pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
