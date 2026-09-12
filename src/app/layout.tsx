import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AppFrame } from "@/components/AppFrame";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { StructuredData } from "@/components/StructuredData";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** Incident titles arrive from BIPAD in Nepali as well as English. */
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
    "Live flood, landslide, earthquake and storm alerts for Nepal, with verified casualty figures from official and international sources.",
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
    locale: "en_NP",
    url: SITE_URL,
    title: "Nature Disaster Alert by DTEmpire",
    description:
      "Live flood, landslide, earthquake and storm alerts for Nepal, with emergency numbers one tap away.",
    images: [
      {
        url: absoluteUrl("/og-card.png"),
        width: 1200,
        height: 630,
        alt: "Nature Disaster Alert: live hazard map for Nepal, drawing on BIPAD, USGS, GDACS and NASA EONET.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nature Disaster Alert by DTEmpire",
    description:
      "Live flood, landslide and earthquake alerts for Nepal, free on Android and iPhone.",
    images: [absoluteUrl("/og-card.png")],
  },
  category: "news",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded focus:border focus:border-edge-strong focus:bg-raised focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <StructuredData />
        <AppFrame>
          <SiteHeader />
          {/* Bottom padding clears the fixed tab bar and the emergency button
              on phones; on wider screens neither is present. */}
          <main
            id="main"
            className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-32 sm:px-6 md:pb-10"
          >
            {children}
          </main>
          <SiteFooter />
        </AppFrame>
      </body>
    </html>
  );
}
