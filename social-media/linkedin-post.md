# LinkedIn post

Three versions below. Pick one, paste it, attach `workflow.png`.
Written in first person so it can go up as-is. Every number and claim in here
is true of the deployed build; if you change the app, change these too.

---

## Version A — the main post (recommended)

> Attach: `workflow.png`

After the floods in Nepal, I kept running into the same problem: the
information existed, but it was scattered across government portals, seismic
feeds and news sites, and none of it answered the only question that matters
when water is rising.

**Is anything dangerous near me right now?**

So I built one that does. It is live at https://disasteralert.ankitgupta.com.np

It pulls from four public sources and merges them into a single view:

• BIPAD, the Government of Nepal's official disaster incident record
• USGS for earthquakes
• GDACS, the European Commission's global alert system
• NASA EONET for satellite-detected events

Plus OpenStreetMap for the nearest hospitals and highways, and Google News for
press coverage. No API keys, no paid data.

What it does:

→ Shows hazards near your location with real distances, "22 km away,
yesterday", not a vague map blob
→ Reports deaths, injuries and displacement per district, resolved down to the
municipality and ward
→ One tap to call 100, 102, 101 or the disaster helpline 1149, plus the nearest
hospitals with their actual numbers
→ Works offline, and says so instead of quietly showing stale data
→ Installs free on both Android and iPhone

Two decisions I want to call out, because they were the hard ones.

**I refused to build the feature people asked for most.** Everyone wanted road
closures and safe routes. No public feed publishes live road status for Nepal.
BIPAD has fields for road damage and across 400 incidents every one read zero.
I could have inferred it from proximity and shipped something that looked
useful. Routing someone onto an unchecked road during a flood can kill them. So
the app names highways with hazards reported nearby, says clearly "this is not
a closure list", and puts Traffic Police 103 one tap away.

**The headline number is labelled as a floor, not a total.** While wiring up
the news feed I noticed Reuters reporting roughly 1,300 dead while my dashboard
showed 28. Part of that was a real pagination bug I had, and fixing it doubled
the captured data. But the deeper cause is that the incident log undercounts
mass-casualty disasters: across the whole monsoon it recorded 196 deaths, never
more than 7 in a day. No feed I can reach publishes the authoritative national
toll. Rather than quietly show a number that looks official and is wrong, the
figures now say what they are and the app tells you to treat them as a floor.

Built with Next.js, React, TypeScript, Tailwind and MapLibre GL. Hardened with
a nonce-based Content Security Policy, validation on every upstream response,
and rate limiting.

There is no account system, and that is deliberate. Distance to a hazard is
calculated inside your browser, so the server is never told where you are.
There is no user database to leak because there is no user database.

Next: Nepali language support, and applying for ReliefWeb API access to get
verified national casualty figures alongside the incident log.

If you work in disaster response in Nepal and something here is wrong or
missing, please tell me. I would rather fix it than defend it.

#Nepal #DisasterManagement #OpenData #NextJS #WebDevelopment #PWA #CivicTech

---

## Version B — short

The information existed. It was just scattered across four portals and none of
it answered the question that matters when water is rising: is anything
dangerous near me right now?

So I built that. Live at https://disasteralert.ankitgupta.com.np

Merges Nepal's official BIPAD incident record with USGS, GDACS and NASA EONET.
Shows hazards near you with real distances, casualty figures resolved to the
municipality, and one tap to call 100, 102 or the disaster helpline 1149.
Works offline. Installs free on Android and iPhone.

The hardest decision was what not to build. Everyone asked for road closures.
No public feed publishes live road status for Nepal, so shipping an inferred
"safe route" could send someone onto a washed-out road. The app tells you which
highways have hazards nearby, states plainly that it is not a closure list, and
puts Traffic Police one tap away.

Next.js, TypeScript, MapLibre. No accounts, no user database, distances
computed on your own device.

#Nepal #DisasterManagement #OpenData #CivicTech #NextJS

---

## Version C — engineering-focused

A build note on shipping data you cannot fully trust.

I built a disaster early-warning app for Nepal:
https://disasteralert.ankitgupta.com.np

It aggregates four keyless public feeds into one normalised schema, dedupes
events reported by more than one source within 50 km and 12 hours, and resolves
every incident down through ward, municipality, district and province.

The interesting problems were not the pipeline.

**1. Sources disagree by an order of magnitude.** The official incident log
recorded 196 deaths across an entire monsoon while press reported roughly 1,300
for a single flood. Both are "true" in that each reports what it measures. The
fix was not to pick one. It was to label precisely what each number is, show
the press figures next to the incident figures, and state that the totals are a
floor.

**2. A missing value is not zero.** Casualty counts are nullable end to end. A
source reporting nothing renders as "not reported", never as 0. In a life
safety context, formatting an unknown death toll as zero is a lie the interface
tells for you.

**3. Some features should not be built.** Live road status does not exist as
open data for Nepal. Inferring it from hazard proximity would produce a
convincing, dangerous artefact. I shipped the proximity data with the
limitation stated above it instead.

**4. Privacy by removing the asset, not guarding it.** Proximity is computed in
the browser against a list the server already returned. There is no account
system and no user table, so there is nothing to breach. The one lookup that
needs a position, finding nearby hospitals, rounds it to about 1 km first and
says so in the interface.

Next.js, React, TypeScript, Tailwind, MapLibre GL, Zod. Nonce-based CSP,
every upstream response schema-validated, timeouts and size caps on every
outbound call, graceful degradation when a feed dies.

#SoftwareEngineering #NextJS #TypeScript #DataEngineering #CivicTech #Nepal
