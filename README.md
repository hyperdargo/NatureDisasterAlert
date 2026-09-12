# Nature Disaster Alert

A live disaster early-warning map for Nepal.

**Live:** https://disasteralert.ankitgupta.com.np
**Install:** https://disasteralert.ankitgupta.com.np/install

Aggregates four public hazard feeds into one view, shows what is happening near
you with real distances, and puts the emergency services one tap away. Installs
free on Android and iPhone.

---

## What it does

- **Near you.** Hazards within 25, 50 or 100 km with real distances, ranked
  gravest first. The distance is computed in your browser, so the server is
  never told where you are.
- **Impact.** Deaths, injuries, missing, displacement and homes destroyed,
  resolved down to municipality and district.
- **Map.** Every incident plotted and coloured by severity.
- **Emergency.** One tap to dial 100, 102, 101, 1149 or 103, plus the nearest
  hospitals and police stations with their real phone numbers.
- **Roads.** Highways with a landslide or flood reported nearby. Explicitly not
  a closure list; see the note below.
- **News.** Press coverage from Reuters, BBC and others, shown next to the
  official figures for context.
- **Offline.** Serves the last good copy and labels it as stale.

## Data sources

All keyless and public. No API key is needed to run this project.

| Source | Role |
|---|---|
| [BIPAD Portal](https://bipadportal.gov.np/) | Government of Nepal's official incident record. The only source with verified casualty figures, and the authority for them here. |
| [USGS](https://earthquake.usgs.gov/fdsnws/event/1/) | Earthquakes, worldwide and at low magnitude inside Nepal. |
| [GDACS](https://www.gdacs.org/) | European Commission multi-hazard alert levels. Publishes modelled exposure, not verified counts. |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Satellite-detected natural events. |
| [OpenStreetMap](https://www.openstreetmap.org/) via Overpass | Nearby hospitals, clinics, police, fire stations and highways. |
| Google News RSS | Press coverage. |

## Three things worth knowing before you read the code

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

- Nonce-based Content Security Policy, set per request (`src/proxy.ts`)
- Every upstream response validated with Zod before it reaches the UI
- Timeouts, response size caps and one retry on transport failures
- Rate limiting on all API routes
- The browser never calls a third-party feed directly; everything is proxied
- The one lookup needing a position (nearby hospitals) rounds it to about 1 km
  before it leaves the browser, and stores nothing

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
    api/             route handlers: events, stats, services, roads, news, assetlinks
    page.tsx         the live dashboard
    prepare/         what to do during each hazard
    install/         Android and iPhone install instructions
  components/        UI, one concern per file
  hooks/             geolocation, PWA install, browser-state stores
  lib/
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
cd android
export JAVA_HOME=~/.bubblewrap/jdk/jdk-17.0.11+9
export ANDROID_HOME=~/.bubblewrap/android_sdk
./gradlew assembleRelease
# then sign with apksigner using android.keystore
```

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
