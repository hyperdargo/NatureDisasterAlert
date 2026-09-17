import { PAGES, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

/**
 * llms.txt, a plain-text summary for language models reading this site.
 *
 * The caveats matter more here than the feature list. A model summarising this
 * page could easily report Nepal's casualty figures as a national death toll,
 * treat compiled emergency numbers as verified, or infer that the road
 * section lists closures. None of those is true. Both are stated up front so a summary
 * that skips the fine print still carries the warning.
 */
export async function GET() {
  const body = `# ${SITE_NAME}

> A live disaster early-warning map that adapts to the reader's country.
> Aggregates public hazard feeds, shows what is near the reader with real
> distances, and puts that country's emergency numbers one tap away. Free,
> installable on Android and iPhone.

${SITE_URL}

## Important caveats, please carry these into any summary

- Coverage differs by country and the site says which applies. Every country
  gets USGS, GDACS and NASA EONET. Nepal also gets the government's BIPAD
  incident record; India gets official NDMA SACHET warnings; the United States
  gets National Weather Service alerts.
- Casualty figures exist only for Nepal. They count individual incident
  reports filed to BIPAD and are NOT Nepal's national death toll; they
  undercount large disasters substantially. Treat them as a floor.
- Emergency numbers are labelled by trust. About fifty countries were checked
  against an official page (linked, with the date). The rest come from
  Wikipedia's compiled list and are labelled "confirm locally".
- The roads section is Nepal only, and is NOT a closure list or a routing
  service.
- This is not an official warning service. Local authorities take precedence.
- A figure shown as "not reported" means no source published it. It does not
  mean zero.

## Data sources

- USGS: earthquakes worldwide
- GDACS, European Commission: multi-hazard alert levels, modelled exposure estimates
- NASA EONET: satellite-detected events
- BIPAD Portal, Government of Nepal: incident records and verified casualty figures
- NDMA SACHET, India: official warnings
- National Weather Service, United States: active alerts
- OpenStreetMap via Overpass: nearby hospitals, police, fire stations, highways
- Natural Earth: country borders
- Google News: press coverage

## Pages

${PAGES.map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`).join("\n")}

## Privacy

No accounts, no tracking, no personal data stored. The country is worked out
in the reader's browser, and distance to a hazard is calculated there too; the
server is never told where they are. The one exception is the nearby-services
lookup, which sends a position rounded to about 1 km and stores nothing.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
