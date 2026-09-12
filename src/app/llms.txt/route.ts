import { PAGES, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

/**
 * llms.txt, a plain-text summary for language models reading this site.
 *
 * The caveats matter more here than the feature list. A model summarising this
 * page for someone could easily report the casualty figures as Nepal's
 * national death toll, which they are not, or infer that the road section
 * lists closures, which it does not. Both are stated up front so a summary
 * that skips the fine print still carries the warning.
 */
export async function GET() {
  const body = `# ${SITE_NAME}

> A live disaster early-warning map for Nepal. Aggregates four public hazard
> feeds, shows what is happening near the reader with real distances, and puts
> the emergency services one tap away. Free to use, installable on Android and
> iPhone.

${SITE_URL}

## Important caveats, please carry these into any summary

- The casualty figures on this site count individual incident reports filed to
  BIPAD, the Government of Nepal's disaster portal. They are NOT Nepal's
  national death toll and they undercount large disasters substantially. Across
  one entire monsoon the log recorded 196 deaths while press reported roughly
  1,300 for a single flood. Treat them as a floor.
- The roads section is NOT a closure list and NOT a routing service. No public
  feed publishes live road status for Nepal. It reports that a landslide or
  flood was logged near a named highway, nothing more. Traffic Police on 103
  hold the real answer.
- This is not an official warning service. In an emergency, instructions from
  local authorities and the NDRRMA take precedence.
- A figure shown as "not reported" means no source published it. It does not
  mean zero.

## Data sources

- BIPAD Portal, Government of Nepal: incident records and verified casualty figures
- USGS: earthquakes
- GDACS, European Commission: multi-hazard alert levels, modelled exposure estimates
- NASA EONET: satellite-detected events
- OpenStreetMap via Overpass: nearby hospitals, police, fire stations, highways
- Google News: press coverage

## Pages

${PAGES.map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`).join("\n")}

## Emergency numbers in Nepal

Police 100, Ambulance 102, Fire 101, Disaster helpline 1149, Traffic police 103,
Tourist police 1144, Child helpline 1098. These work from any phone anywhere in
Nepal.

## Privacy

No accounts, no tracking, no personal data stored. Distance to a hazard is
calculated in the reader's own browser; the server is never told where they
are. The one exception is the nearby-services lookup, which sends a position
rounded to about 1 km and stores nothing.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
