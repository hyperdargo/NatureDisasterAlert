import { AUTHOR, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Schema.org markup for search engines.
 *
 * A note on type choice, because the obvious suggestion is wrong here.
 * LocalBusiness is the schema people reach for when they want rich results,
 * but this is not a business, has no address, no opening hours and sells
 * nothing. Declaring it would be misrepresenting the site to search engines,
 * which is exactly the kind of thing structured-data spam policies exist to
 * catch, and a manual action would cost far more than the rich result gained.
 *
 * WebApplication is what this actually is, and it supports the fields that
 * matter: it is free, it runs in a browser, and it covers Nepal.
 */
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "UtilitiesApplication",
        applicationSubCategory: "Emergency and disaster alerts",
        operatingSystem: "Any modern web browser, Android, iOS",
        browserRequirements: "Requires JavaScript and a modern browser",
        description:
          "Live flood, landslide, earthquake and storm alerts for Nepal, aggregating the Government of Nepal's BIPAD incident record with USGS, GDACS and NASA EONET. Shows hazards near you with real distances and puts the emergency services one tap away.",
        inLanguage: "en",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" },
        featureList: [
          "Hazards near your location with real distances",
          "Casualty and impact figures by district",
          "One-tap emergency dialling and nearest hospitals",
          "Road advisory for highways with hazards reported nearby",
          "Works offline",
        ],
        screenshot: absoluteUrl("/og-card.png"),
        author: { "@id": `${SITE_URL}/#author` },
        publisher: { "@id": `${SITE_URL}/#publisher` },
        // Naming the upstreams is honest attribution and helps a reader (or a
        // crawler) judge how much weight the figures deserve.
        isBasedOn: [
          { "@type": "Dataset", name: "BIPAD Portal", url: "https://bipadportal.gov.np/" },
          {
            "@type": "Dataset",
            name: "USGS Earthquake Hazards Program",
            url: "https://earthquake.usgs.gov/",
          },
          { "@type": "Dataset", name: "GDACS", url: "https://www.gdacs.org/" },
          { "@type": "Dataset", name: "NASA EONET", url: "https://eonet.gsfc.nasa.gov/" },
        ],
        about: {
          "@type": "Place",
          name: "Nepal",
          address: { "@type": "PostalAddress", addressCountry: "NP" },
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#publisher` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#publisher`,
        name: "DTEmpire",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png") },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#author`,
        name: AUTHOR,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // The content is a literal built above, not user input, so there is
      // nothing here that an attacker can reach.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
