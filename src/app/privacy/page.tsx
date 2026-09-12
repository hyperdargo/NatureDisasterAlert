import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site does and does not collect. No accounts, no tracking, and your location stays on your device.",
  alternates: { canonical: "/privacy" },
};

/**
 * The privacy policy.
 *
 * Written to be true rather than to be safe. Most policies list every
 * permission the law allows the operator to take; this one lists what the code
 * actually does, and the one place where a coordinate genuinely leaves the
 * device is called out rather than hidden behind "we may share data with
 * service providers".
 *
 * If the behaviour of the app changes, this page changes with it. A privacy
 * policy that has drifted from the code is worse than none, because people
 * relied on it.
 */
const COLLECTED = [
  {
    what: "Nothing that identifies you",
    detail:
      "There is no sign-up, no login, no email address and no user database. Nothing on this site asks who you are, and there is no record to leak if the server were ever breached.",
  },
  {
    what: "No analytics or advertising trackers",
    detail:
      "No Google Analytics, no advertising pixels, no third-party tracking scripts of any kind. The Content Security Policy actively blocks them, so one could not be added silently.",
  },
  {
    what: "No cookies for tracking",
    detail:
      "The site sets no tracking cookies. Two small preferences are kept in your browser's own storage: whether you dismissed the install card, and whether you were already asked for location. They never leave your device and are readable only by this site.",
  },
] as const;

const LOCATION = [
  {
    title: "Distances are worked out on your device",
    detail:
      "When you allow location access, your coordinates stay in your browser. The hazard list is already downloaded, and the distance between you and each hazard is calculated locally. The server is never told where you are, which is why it can show what is near you without knowing anything about you.",
  },
  {
    title: "The one exception, stated plainly",
    detail:
      "Finding the nearest hospitals and police stations genuinely requires knowing roughly where you are. For that single lookup, your position is rounded to two decimal places, about one kilometre, before it leaves your browser. The rounded point goes to this site's server, which asks OpenStreetMap and returns the result. It is not written to any log or database, and one kilometre is coarse enough to find the right hospitals and too coarse to identify a household.",
  },
  {
    title: "You can refuse, and the site still works",
    detail:
      "Decline the location prompt and everything except the proximity list keeps working: the map, the incident log, the charts, the news and every emergency number. Your browser also lets you revoke the permission at any time in its site settings.",
  },
] as const;

const THIRD_PARTIES = [
  ["Map tiles", "CARTO and OpenStreetMap", "Your browser requests map images directly, so those services can see your IP address and which area of the map you are viewing. They are not told who you are."],
  ["Hazard data", "BIPAD, USGS, GDACS, NASA EONET", "Requested by this site's server, not your browser. Those services never see you."],
  ["Nearby facilities", "OpenStreetMap via Overpass", "Requested by this site's server using the rounded position described above."],
  ["Press coverage", "Google News", "Requested by this site's server. Following a headline takes you to the publisher's own site, which has its own policy."],
] as const;

export default function PrivacyPage() {
  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
          Privacy
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          This describes what the code actually does, not what a policy template
          permits. If the app changes, this page changes with it.
        </p>
      </div>

      <section className="mt-8 max-w-3xl rounded-lg border p-4 sm:p-5" style={{ borderColor: "var(--status-good)" }}>
        <h2 className="flex items-center gap-2 text-base font-medium text-ink">
          <ShieldCheck size={19} weight="fill" className="text-good" aria-hidden />
          The short version
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          No accounts, no tracking, no personal data stored. Your location is
          used on your own device to work out what is near you. The only time a
          coordinate is sent anywhere is when you ask for nearby hospitals, and
          it is rounded to about a kilometre first.
        </p>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium text-ink">What is not collected</h2>
        <dl className="mt-3 divide-y divide-edge overflow-hidden rounded-lg border border-edge bg-surface">
          {COLLECTED.map((item) => (
            <div key={item.what} className="p-4 sm:p-5">
              <dt className="text-sm text-ink">{item.what}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-secondary">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium text-ink">How your location is used</h2>
        <dl className="mt-3 divide-y divide-edge overflow-hidden rounded-lg border border-edge bg-surface">
          {LOCATION.map((item) => (
            <div key={item.title} className="p-4 sm:p-5">
              <dt className="text-sm text-ink">{item.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-secondary">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium text-ink">Who else is involved</h2>
        <p className="mt-1 text-xs text-ink-secondary">
          The site draws on public data. This is who sees what.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-edge">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-raised text-ink-secondary">
              <tr>
                <th scope="col" className="p-3 text-left font-medium">Purpose</th>
                <th scope="col" className="p-3 text-left font-medium">Service</th>
                <th scope="col" className="p-3 text-left font-medium">What they can see</th>
              </tr>
            </thead>
            <tbody>
              {THIRD_PARTIES.map(([purpose, service, sees]) => (
                <tr key={purpose} className="border-t border-edge bg-surface">
                  <th scope="row" className="p-3 text-left font-normal text-ink">{purpose}</th>
                  <td className="p-3 text-ink-secondary">{service}</td>
                  <td className="p-3 text-ink-secondary">{sees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium text-ink">Server logs</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Like any web server, this one records ordinary request information
          such as IP address, time and the page requested, which is what makes
          it possible to keep the site running and to stop abuse. Those logs are
          not used to build a profile of anyone, are not sold or shared, and are
          not connected to any identity, because none is collected.
        </p>
      </section>

      <p className="mt-8 max-w-2xl text-sm text-ink-secondary">
        Questions about any of this are answered on the{" "}
        <Link href="/faq" className="text-ink underline underline-offset-2">
          questions page
        </Link>
        .
      </p>
    </>
  );
}
