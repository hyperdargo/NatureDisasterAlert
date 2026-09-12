# LinkedIn profile content

Sections you can paste straight into your profile. Everything here is true of
the shipped build. Update it if the app changes.

Live: https://disasteralert.ankitgupta.com.np
Install: https://disasteralert.ankitgupta.com.np/install

---

## Headline (220 characters max)

Pick one.

**A — builder framing**
> Full-stack developer · Built Nepal's live disaster early-warning map at disasteralert.ankitgupta.com.np · Next.js, TypeScript, open data

**B — problem framing**
> I build software for problems that matter · Live hazard alerts for Nepal, aggregating four public disaster feeds into one map · Next.js · TypeScript

**C — short**
> Full-stack developer · Next.js, TypeScript, open data · Building disaster early-warning tools for Nepal

---

## About section

> Keep the first two lines strong. LinkedIn truncates the rest behind "see more".

I build things that are useful when something goes wrong.

My current project is a disaster early-warning map for Nepal, live at
disasteralert.ankitgupta.com.np. After the floods, I found that the information
people needed already existed but was scattered across a government portal, two
international monitoring services and a seismic feed, none of which answered
the question that actually matters: is anything dangerous near me right now.

So I built the thing that answers it. The app merges Nepal's official BIPAD
incident record with USGS, GDACS and NASA EONET, resolves every incident down
through ward, municipality and district, and shows you what is near you with
real distances. It has one-tap dialling for the emergency services, the nearest
hospitals pulled from OpenStreetMap, offline support, and it installs free on
both Android and iPhone.

The engineering I am most pleased with is not a feature. It is the restraint.
Everyone wanted road closures and safe routes. No public feed publishes live
road status for Nepal, so any such feature would have been inferred, and
inferring a safe route during a flood can get someone killed. The app shows
which highways have hazards reported nearby, says plainly that it is not a
closure list, and puts Traffic Police one tap away instead.

Same instinct elsewhere: an unknown death toll renders as "not reported", never
as zero. Totals say which source they came from and that they are a floor
rather than a national figure. There is no account system, so there is no user
database to leak, and the distance between you and a hazard is calculated
inside your own browser.

Working with: TypeScript, Next.js, React, Node, Tailwind, MapLibre GL, Zod.
Interested in: civic technology, open data, and anything where correctness
matters more than polish.

Open to conversations about work in Nepal or remote.

---

## Featured / Project entry

**Project name**
Nature Disaster Alert

**Description (2,000 character limit)**

A live disaster early-warning map for Nepal, built and deployed solo.

Aggregates four keyless public data sources into a single normalised feed:
BIPAD (the Government of Nepal's official disaster incident record), USGS for
seismic activity, GDACS (European Commission) for global multi-hazard alerts,
and NASA EONET for satellite-detected events. Adds OpenStreetMap for nearby
hospitals and highways, and Google News for press coverage.

What it does
• Location-aware hazard proximity with real distances, computed on the device
• Casualty and impact figures resolved to municipality and district
• Derived impact rating shown alongside the raw figures that produced it
• One-tap emergency dialling, plus nearest hospitals with real phone numbers
• Road advisory that names affected highways without claiming closures
• Works offline and labels stale data as stale
• Installs free on Android (APK) and iPhone (Safari home screen)

Engineering notes
• Every upstream response is schema-validated; a dead feed degrades coverage
  rather than blanking the page
• Nonce-based Content Security Policy, rate limiting, timeouts and size caps on
  every outbound request
• No user accounts and no personal data stored, so there is nothing to breach
• Casualty counts are nullable end to end: "not reported" and 0 are different
  facts and are never conflated

Stack: Next.js, React, TypeScript, Tailwind CSS, MapLibre GL, Zod, Node.

Live: https://disasteralert.ankitgupta.com.np

---

## Experience bullet points

If you list this under a role or as an independent project:

• Designed and shipped a public disaster early-warning application for Nepal,
  aggregating four government and international hazard feeds into one live map
• Built a normalisation and de-duplication pipeline that merges the same
  real-world event reported by multiple sources within 50 km and 12 hours
• Resolved point incidents to Nepal's administrative hierarchy (ward →
  municipality → district → province) for district-level impact reporting
• Implemented location-aware alerting with proximity computed client-side, so
  no user location is transmitted or stored
• Hardened the deployment with a nonce-based CSP, per-request validation of all
  third-party data, rate limiting and graceful degradation
• Diagnosed and fixed a silent pagination defect that was truncating the
  reporting window and under-counting recorded casualties by roughly half
• Packaged the application as an installable PWA and a signed Android APK

---

## Skills to add

TypeScript · Next.js · React · Node.js · Tailwind CSS · REST APIs ·
Data Pipelines · Geospatial (MapLibre, GeoJSON) · Web Security (CSP) ·
Progressive Web Apps · Open Data

---

## Comment replies to keep handy

**"Is this official?"**
> No, and the site says so. It aggregates public feeds from the Government of
> Nepal's BIPAD portal, USGS, GDACS and NASA. In an emergency, follow the
> instructions of local authorities and the NDRRMA.

**"Why are the death figures lower than the news?"**
> Good catch, and the app flags this itself. Those figures count individual
> incident reports filed to BIPAD, which undercounts large disasters
> substantially. They are labelled as a floor, not a national total, with press
> coverage shown alongside them.

**"Why no road closures?"**
> Because no public feed publishes live road status for Nepal. I could infer it
> from hazard proximity, but a wrong "safe route" during a flood is dangerous.
> The app names highways with hazards nearby, states clearly that it is not a
> closure list, and links to Traffic Police on 103.

**"Is it open source?"**
> The repository is private for now. Happy to talk through the architecture.
