# LinkedIn post: what broke, and what fixing it taught me

Every bug below actually happened while building this, and every fix is in the
deployed code. Pick a version, paste it, attach an image from
`image-prompts.md`.

Live: https://disasteralert.ankitgupta.com.np

---

## Version A — the main post (recommended)

I built a disaster early-warning app for Nepal. Then I spent just as long
fixing it. These were the bugs worth remembering.

**1. My dashboard said 28 people died. Reuters said 1,300.**

I found this by accident, while wiring up a news feed. Two causes. One was a
plain bug: my pagination silently capped at 600 records, so I was reading two
weeks of a thirty day window and never knew, because nothing in the response
says "there is more". Fixing it doubled the data.

The deeper cause was worse. The government incident log genuinely undercounts
mass-casualty disasters: across an entire monsoon it recorded 196 deaths, never
more than 7 in a day. No feed I could reach publishes the real national toll.

I could have shown the number and moved on. Instead the figures now say what
they are, a floor and not a total, with press coverage next to them. A number
that looks official and is wrong is worse than no number.

**2. The site looked perfect and did absolutely nothing.**

Every page rendered. No errors. And not a single button worked.

My Content Security Policy paired a per-request nonce with strict-dynamic. But
my pages are statically rendered: the HTML is built once and served to
everyone, carrying no nonce, while the server minted a fresh nonce per request.
They could never match, and strict-dynamic makes browsers ignore every other
source, so all twelve scripts on every page were blocked. React never started.

What made it hard was that the failure was invisible: correct HTML, no console
error I could catch, buttons that simply did nothing. I found it by noticing
that clicking a link caused a full page reload instead of a client-side
navigation.

**3. Building the Android app quietly broke the website.**

The app build reuses the web build with different settings, then restores the
config. What it did not restore was the build directory, which was left
holding an export build. Deploy after building the app and every API route
answered 308 then 404.

The build script now deletes that directory on the way out, so a deploy that
forgets to rebuild fails loudly instead of shipping a broken site quietly.

**4. The app was embedding a copy of itself.**

The APK ships the interface inside it, and the interface includes the public
folder, and the public folder contained the APK. Every build wrapped the
previous one. 11.77 MB and climbing before I caught it. 5.65 MB after.

**5. Notifications never worked on Android, and never said so.**

Android's WebView has never implemented the Web Notifications API. My code
checked for support, correctly found none, and quietly hid the button. No
error, no warning, just a feature that silently did not exist on every single
Android install. It now uses the native notification system instead.

**6. A 502 from a single number.**

Docker mapped the host port to container port 3000. The app inside was
listening on 4321. Nothing answered, Cloudflare returned 502, and the site was
down. One environment variable was driving two things that had to agree.

---

The thread through all of these: **the dangerous failures were the silent
ones.** A crash tells you where to look. A site that renders correctly and does
nothing, a number that is confidently wrong, a notification system that hides
itself rather than erroring, a file that grows 5 MB per build. Those cost me
hours each, and every one of them shipped before I noticed.

What actually found them was not cleverness. It was checking things I assumed
were fine: comparing my numbers against a news headline, clicking a link to see
whether navigation was client-side, looking at what was actually inside the APK.

Built with Next.js, React, TypeScript, Tailwind and MapLibre. Free on Android
and iPhone.

#SoftwareEngineering #Debugging #NextJS #TypeScript #CivicTech #Nepal

---

## Version B — short

I built a disaster early-warning app for Nepal. The bugs taught me more than
the build did.

→ My dashboard showed 28 deaths. Reuters reported 1,300. Partly a pagination
cap I never noticed, partly a data source that genuinely undercounts. The
figures now say they are a floor, not a total.

→ The site rendered perfectly and no button worked. My Content Security Policy
was blocking every script, so React never started. Found it by noticing that
clicking a link caused a full page reload.

→ Building the Android app silently broke the website by leaving the wrong
build behind.

→ The app was embedding a copy of itself. 11.77 MB and growing.

→ Android notifications never worked and never said so, because Android's
WebView has no Notifications API. My code found no support and quietly hid the
button.

Every dangerous one was silent. A crash tells you where to look; a site that
renders fine and does nothing does not.

https://disasteralert.ankitgupta.com.np

#SoftwareEngineering #Debugging #NextJS #CivicTech

---

## Version C — single-bug post, for the strongest story

My dashboard said 28 people had died. Reuters said 1,300.

I only noticed because I was adding a news feed and the headline appeared next
to my own number.

Two things were wrong. The first was an ordinary bug: my pagination capped at
600 records, so a thirty day window was quietly returning two weeks. Nothing in
the response indicates truncation, so there was nothing to notice. Fixing it
doubled the data.

The second was not fixable. The official incident log undercounts large
disasters by an order of magnitude. Across an entire monsoon it recorded 196
deaths, never more than 7 in a day, while a single flood killed roughly 1,300.
No source I can reach publishes the authoritative figure.

So the app does not pretend. The figures are labelled as a floor and not a
national total, and press coverage sits directly beneath them.

The instinct is to show the number you have. But people screenshot these
figures. An official-looking number that is wrong by a factor of forty is worse
than admitting what you do not know.

https://disasteralert.ankitgupta.com.np

#SoftwareEngineering #DataEngineering #CivicTech #Nepal
