# Nature Disaster Alert

A live disaster early-warning map that adapts to the country you are in. Deepest
coverage for Nepal.

**Live:** https://disasteralert.ankitgupta.com.np
**Install:** https://disasteralert.ankitgupta.com.np/install

Aggregates public hazard feeds into one view, shows what is happening near you
with real distances, and puts your country's emergency numbers one tap away.
Installs free on Android and iPhone.

---

## What it does

- **Your country, automatically.** A first guess from the device time zone, then
  your GPS position matched against country borders in the browser, and a
  country switcher on every page that always wins. Emergency numbers, official
  warnings, news, the map view and the guides all follow it. Nothing about
  your location is sent to work this out.
- **Near you.** Hazards within 25, 50 or 100 km with real distances, ranked
  gravest first. The distance is computed in your browser, so the server is
  never told where you are.
- **Impact.** Deaths, injuries, missing, displacement and homes destroyed,
  resolved down to municipality and district.
- **Map.** Every incident plotted and coloured by severity.
- **Emergency.** One tap to dial your country's emergency numbers, labelled by
  how they were verified, plus the nearest hospitals and police stations with
  their real phone numbers.
- **Roads (Nepal).** Highways with a landslide or flood reported nearby.
  Explicitly not a closure list; see the note below.
- **News.** Press coverage from Reuters, BBC and others, shown next to the
  official figures for context.
- **Offline.** Serves the last good copy and labels it as stale.

## Data sources

All keyless and public. No API key is needed to run this project.

| Source | Role |
|---|---|
| [BIPAD Portal](https://bipadportal.gov.np/) | Government of Nepal's official incident record. The only source with verified casualty figures, and the authority for them here. |
| [NDMA SACHET](https://sachet.ndma.gov.in/) | India's national alerting feed. Official warnings from IMD, CWC and state agencies. |
| [National Weather Service](https://www.weather.gov/documentation/services-web-api) | Active official alerts for the United States. |
| [USGS](https://earthquake.usgs.gov/fdsnws/event/1/) | Earthquakes, worldwide and at low magnitude inside Nepal. |
| [GDACS](https://www.gdacs.org/) | European Commission multi-hazard alert levels. Publishes modelled exposure, not verified counts. |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Satellite-detected natural events. |
| [OpenStreetMap](https://www.openstreetmap.org/) via Overpass | Nearby hospitals, clinics, police, fire stations and highways. |
| Google News RSS | Press coverage, searched per country. |
| [Natural Earth](https://www.naturalearthdata.com/) | Country borders, for locating events and readers. Public domain. |
| [IANA tz database](https://www.iana.org/time-zones) | Time zone to country, for the first guess. Public domain. |
| [Wikipedia](https://en.wikipedia.org/wiki/List_of_emergency_telephone_numbers) | Compiled emergency numbers (CC BY-SA 4.0), used only where no official check was made. |

## Four things worth knowing before you read the code

**0. Emergency numbers carry their provenance.**
About fifty countries (every EU member state, India, Nepal, the US, Canada,
Mexico, the UK, Australia, New Zealand, Japan, China, Bangladesh, Pakistan, Sri
Lanka, Bhutan, the Philippines, Indonesia, Brazil, South Africa, Turkey,
Switzerland) were checked against an official page, linked beside the numbers
with the date. Everything else comes from Wikipedia's compiled list and is
labelled "confirm locally". Nepal's 1149, 1144 and 1098 could not be confirmed
on an official page when checked and are shown under "Not re-checked". To
promote a country, see `src/lib/countries/emergency.ts`. Country data is
rebuilt with `node scripts/build-country-data.mjs`.

**1. The headline figures are a floor, not a national total.**
They count individual incident reports filed to BIPAD. That log undercounts
mass-casualty disasters severely: across one entire monsoon it recorded 196
deaths, never more than seven in a day, while press reported roughly 1,300 for a
single flood. No feed reachable here publishes the authoritative national toll.
Rather than show an official-looking number that is wrong, the interface states
what the figures are and shows press coverage beside them. See
`src/components/CoverageNotice.tsx`.

**2. There is no "safe route" feature, deliberately.**
No public feed publishes live road status for Nepal. BIPAD has road-damage
fields and across 400 recent incidents every one read zero. Inferring closures
from hazard proximity would produce a convincing artefact that could send
someone onto a washed-out road. The app names highways with hazards nearby,
says plainly that it is not a closure list, and links to Traffic Police on 103.
See `src/lib/sources/roads.ts`.

**3. A missing number is not zero.**
Casualty counts are nullable end to end. A source that reported nothing renders
as "not reported"; a source that reported none renders as 0. Conflating them
would be a lie told by formatting, in a context where people screenshot these
numbers.

## Security posture

There are no user accounts and no personal data is stored, so there is no user
database to breach. Beyond that:

- Content Security Policy on every response (`src/proxy.ts`). Scripts are
  allowed by origin rather than by nonce: nonces require `force-dynamic` on
  every page, which cannot coexist with the static export the Android app is
  built from. The trade-off and what it costs are written out in that file.
- Every upstream response validated with Zod before it reaches the UI
- Timeouts, response size caps and one retry on transport failures
- Rate limiting on all API routes
- The browser never calls a third-party feed directly; everything is proxied
- The one lookup needing a position (nearby hospitals) rounds it to about 1 km
  before it leaves the browser, and stores nothing

## Running with Docker

```bash
docker compose up -d --build   # then open http://localhost:3000
```

The container holds no state: all data is fetched live from the public feeds
and cached in memory, so there is no volume to back up and restarting loses
nothing. It runs as a non-root user on a read-only filesystem.

Set `SITE_URL` when serving from a real hostname, or canonical tags, the
sitemap and social cards will all point at localhost.

## Deliberate omissions

Three things commonly recommended for a "professional" site are absent on
purpose:

- **No analytics.** Not Google Analytics, not any other. The site tells every
  visitor it does not track them, and the Content Security Policy blocks
  third-party script origins. Adding a tracker would make the privacy page a
  lie.
- **No LocalBusiness schema.** This is not a business, has no address and sells
  nothing. Declaring that markup to win a rich result would be structured-data
  spam. It is marked up as a `WebApplication`, which is what it is.
- **No case studies, testimonials or team photos.** Those belong on an agency
  site. This is a public safety tool and the page has one job.

## Running locally

```bash
npm install          # also copies MapLibre's worker into public/
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start
npx tsc --noEmit     # typecheck
npx eslint src       # lint
```

## Project layout

```
src/
  app/
    api/             route handlers: events, stats, services, roads, news, warnings, assetlinks
    page.tsx         the live dashboard (status stage, map, official record, guides)
    prepare/         what to do during each hazard
    install/         Android and iPhone install instructions
  components/        UI, one concern per file; home/ holds the home screen sections
  data/              generated country data: borders, globe dots, time zones, numbers
  hooks/             geolocation, PWA install, browser-state stores
  lib/
    countries/       country identity, emergency numbers, per-country coverage
    sources/         one adapter per upstream feed
    aggregate.ts     merge and de-duplicate across sources
    stats.ts         daily series, by hazard, by district
    impact.ts        derived impact rating
android/             Trusted Web Activity wrapper (Bubblewrap)
social-media/        launch post copy and the workflow diagram
```

## Android build

The APK is a Trusted Web Activity: a thin native shell around the live site, so
the site must be deployed for it to work.

```bash
npm run apk
```

That builds, aligns, signs and verifies in one step, writing the result to
`public/app/nature-disaster-alert.apk` and printing its SHA-256.

**Where users actually download it.** The site serves it from `public/app/`,
which is why the APK is committed. Two alternatives were tried and rejected:
GitHub release assets return 404 to anyone not signed in while this repository
is private, and an external file host is one more thing that can go down and
take the install route with it, which is exactly what happened.

The cost is a 6MB binary in git history per release. If that becomes tiresome,
set `NEXT_PUBLIC_APK_URL` to a CDN and stop committing it.

`android/android.keystore` and `android/signing-key.env` are **not** in this
repository and must not be. Anyone holding them can publish an update Android
accepts as genuine. Keep a private backup; losing them means existing installs
cannot be upgraded.

For the installed app to open without a URL bar, the signing certificate's
SHA-256 fingerprint must be served at `/.well-known/assetlinks.json`. That is
handled by `src/app/api/assetlinks/route.ts` behind a rewrite.

## iOS

There is no free way to distribute an iOS app. TestFlight and the App Store
both require the Apple Developer Program at 99 USD per year, and the free
Apple ID route expires after seven days and disables push notifications.

The supported free path is the PWA: open the site in Safari, tap Share, then
Add to Home Screen. On iOS 16.4 and later that gets a home-screen icon,
standalone display, offline support and working notifications.

## Disclaimer

This aggregates public feeds and is not an official warning service. In an
emergency follow the instructions of local authorities and the NDRRMA.
Casualty figures are provisional and are revised as reports are verified.
