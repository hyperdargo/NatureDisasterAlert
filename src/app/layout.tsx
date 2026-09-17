import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mona_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AppFrame } from "@/components/AppFrame";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { StructuredData } from "@/components/StructuredData";

/**
 * Mona Sans with its width axis: display type is set wide, and the home
 * screen's country name widens into place as the globe lands.
 */
const monaSans = Mona_Sans({
  variable: "--font-mona",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** Nepal's incident titles arrive in Nepali as well as English. */
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-deva",
  subsets: ["devanagari"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  // Makes every relative URL in metadata absolute, which canonical tags and
  // social cards both require.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: "Nature Disaster Alert by DTEmpire",
    template: "%s - Nature Disaster Alert",
  },
  description:
    "Live earthquake, flood, cyclone, wildfire and storm alerts for your country, with its emergency numbers one tap away. Deepest coverage for Nepal.",
  applicationName: "Nature Disaster Alert",
  appleWebApp: {
    capable: true,
    title: "Disaster Alert",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS ignores the manifest for the home-screen icon and uses this instead.
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en",
    url: SITE_URL,
    title: "Nature Disaster Alert by DTEmpire",
    description:
      "Live hazard alerts for your country: what is near you, how far, and who to call.",
    images: [
      {
        url: absoluteUrl("/og-card.png"),
        width: 1200,
        height: 630,
        alt: "Nature Disaster Alert: live hazard map drawing on USGS, GDACS, NASA EONET and national feeds.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nature Disaster Alert by DTEmpire",
    description:
      "Live hazard alerts for your country, free on Android and iPhone.",
    images: [absoluteUrl("/og-card.png")],
  },
  category: "news",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${monaSans.variable} ${geistMono.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-page font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-page"
        >
          Skip to content
        </a>
        <StructuredData />
        <AppFrame>
          <SiteHeader />
          {/* Pages own their width: the home screen is full-bleed, the rest
              use the .page container. */}
          <main id="main" className="relative -mt-[4.25rem] flex-1">
            {children}
          </main>
          <SiteFooter />
        </AppFrame>
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
