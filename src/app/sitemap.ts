import type { MetadataRoute } from "next";

// These never vary per request, and the static export requires saying so.
export const dynamic = "force-static";
import { PAGES, absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
