/**
 * Canonical site identity, in one place.
 *
 * Every absolute URL the app emits (canonical tags, sitemap, social cards,
 * structured data) derives from here, so a domain change is a single edit and
 * cannot leave half the metadata pointing at the old host.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://disasteralert.ankitgupta.com.np";

export const SITE_NAME = "Nature Disaster Alert";
export const SITE_TAGLINE = "by DTEmpire";
export const AUTHOR = "Ankit Gupta";

/**
 * Where the Android APK is downloaded from.
 *
 * Served from this site by default. That keeps the download on a domain the
 * reader already trusts and has no extra moving part to fail: an external file
 * host going down takes the install route with it, which is exactly what
 * happened once already.
 *
 * Set NEXT_PUBLIC_APK_URL to point somewhere else, for example a file host or
 * a CDN, if the bandwidth ever becomes a problem.
 */
export const APK_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_APK_URL ?? "/app/nature-disaster-alert.apk";

/** True when the download is served from this site rather than elsewhere. */
export const APK_IS_LOCAL = APK_DOWNLOAD_URL.startsWith("/");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Every indexable page, used by the sitemap and the llms.txt summary. */
export const PAGES = [
  {
    path: "/",
    title: "Near me",
    description:
      "Live hazards near you, in your country, with real distances and your emergency numbers one tap away.",
    changeFrequency: "hourly" as const,
    priority: 1,
  },
  {
    path: "/incidents",
    title: "Incident log",
    description:
      "Every hazard reported in your country in the last 30 days, with official warnings where they exist and verified casualty figures for Nepal.",
    changeFrequency: "hourly" as const,
    priority: 0.9,
  },
  {
    path: "/news",
    title: "News",
    description:
      "Press coverage of disasters in your country, and hazards being tracked around the world.",
    changeFrequency: "hourly" as const,
    priority: 0.7,
  },
  {
    path: "/roads",
    title: "Roads",
    description:
      "Highways in Nepal with a landslide or flood reported nearby. Not a closure list.",
    changeFrequency: "daily" as const,
    priority: 0.7,
  },
  {
    path: "/prepare",
    title: "What to do",
    description:
      "What to do during an earthquake, flood, landslide, cyclone, wildfire, heat wave, lightning storm, house fire or snakebite.",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/install",
    title: "Install the app",
    description:
      "Install Nature Disaster Alert free on Android or iPhone, with offline access and alerts for hazards near you.",
    changeFrequency: "monthly" as const,
    priority: 0.6,
  },
  {
    path: "/faq",
    title: "Questions",
    description:
      "How the site picks your country, how far the emergency numbers can be trusted, and where the data comes from.",
    changeFrequency: "monthly" as const,
    priority: 0.6,
  },
  {
    path: "/privacy",
    title: "Privacy",
    description:
      "What this site does and does not collect. No accounts, no tracking, and your location stays on your device.",
    changeFrequency: "yearly" as const,
    priority: 0.4,
  },
] as const;
