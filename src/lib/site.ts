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
 * Hosted on a separate file service rather than served from this site, so a
 * 6MB binary is not sitting in the web deployment and the download does not
 * compete with the app itself for bandwidth during an emergency.
 *
 * It is an external page rather than a direct file, which is deliberate: the
 * reader sees the filename and size before anything downloads, which is the
 * right way round for an app installed outside the Play Store.
 */
export const APK_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_APK_URL ??
  "https://depot.ankitgupta.com.np/index.php/s/2Nc7dCxzoGT7wNs";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Every indexable page, used by the sitemap and the llms.txt summary. */
export const PAGES = [
  {
    path: "/",
    title: "Near me",
    description:
      "Live hazards near your location in Nepal, with real distances and one-tap emergency dialling.",
    changeFrequency: "hourly" as const,
    priority: 1,
  },
  {
    path: "/incidents",
    title: "Incident log",
    description:
      "Every hazard incident reported in Nepal in the last 30 days, with daily casualty trends and the worst-affected districts.",
    changeFrequency: "hourly" as const,
    priority: 0.9,
  },
  {
    path: "/news",
    title: "News",
    description:
      "Press coverage of disasters in Nepal, and hazards being tracked in other countries.",
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
      "What to do during a snakebite, landslide, flood, earthquake, lightning storm or house fire in Nepal.",
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
      "Where the data comes from, why the casualty figures are lower than the news, and why there is no safe-route feature.",
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
