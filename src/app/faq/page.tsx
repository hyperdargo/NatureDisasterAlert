import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Questions",
  description:
    "Where the data comes from, why the casualty figures are lower than the news, and why there is no safe-route feature.",
  alternates: { canonical: "/faq" },
};

/**
 * The questions people actually ask, answered plainly.
 *
 * Two of these exist because the honest answer is awkward: the casualty
 * figures look wrong next to the news, and the feature everyone wants is
 * missing on purpose. Burying either would be the easy choice and the wrong
 * one, so both lead.
 *
 * The same array feeds the FAQPage structured data, so the answers a search
 * engine shows can never drift from the answers on the page.
 */
const FAQS = [
  {
    q: "Why are the death figures here lower than the news?",
    a: "Because they are counting different things. The figures on this site count individual incident reports filed to BIPAD, the Government of Nepal's disaster portal. That log undercounts mass-casualty disasters severely: across one entire monsoon it recorded 196 deaths, never more than seven in a day, while international press reported roughly 1,300 dead from a single flood. No feed this site can reach publishes the authoritative national toll. Treat these numbers as a floor and a guide to which districts are being hit, never as a national total. Press coverage is shown alongside them for that reason.",
  },
  {
    q: "Why is there no safe route or road closure feature?",
    a: "Because no public feed publishes live road status for Nepal, and inventing one would be dangerous. BIPAD has fields for road and bridge damage and across 400 recent incidents every single one read zero. This site could infer closures from hazard proximity and it would look convincing, but a wrong safe route during a flood can send someone onto a washed-out road. Instead the Roads page names highways with a landslide or flood reported nearby, says clearly that it is not a closure list, and links to Traffic Police on 103, who have the real answer.",
  },
  {
    q: "Is this an official government service?",
    a: "No. It aggregates public feeds from the Government of Nepal's BIPAD portal, the USGS, GDACS run by the European Commission, and NASA. It is not operated by any of them and is not an official warning service. In an emergency, instructions from local authorities and the National Disaster Risk Reduction and Management Authority take precedence over anything shown here.",
  },
  {
    q: "Does it track me or store my location?",
    a: "No. There is no account system and no user database, so there is nothing to breach. The distance between you and a hazard is calculated inside your own browser, against a list the server already sent, so the server is never told where you are. The one exception is the nearby-hospitals search: that needs a position, so your location is rounded to about one kilometre before it is sent and nothing is stored at either end.",
  },
  {
    q: "How often does the data update?",
    a: "The live view refreshes about every three minutes while it is open, and again whenever you return to it. Behind that, each source is polled on its own schedule: incident records every few minutes, press coverage every twenty minutes, road information every few hours. If a source fails, the page keeps the last good data and says so rather than showing a blank or a stale figure without warning.",
  },
  {
    q: "What does it mean when a figure says not reported?",
    a: "That no source published a number, which is different from a source publishing zero. A blank death toll shown as 0 would be a lie told by formatting, so the two are always kept apart. Not reported means unknown; 0 means someone checked and there were none.",
  },
  {
    q: "Is it free, and does it work on iPhone?",
    a: "It is free on both. On Android you can install the app file directly from the install page. On iPhone, open the site in Safari, tap Share, then Add to Home Screen: that gives you the same app with offline support and alerts on iOS 16.4 and later. There is no paid tier and no App Store listing, because Apple charges 99 US dollars a year for the developer programme that TestFlight and the App Store both require.",
  },
  {
    q: "Why is snakebite listed as a disaster?",
    a: "Because in the incident record it kills more people than any other hazard. It is not dramatic and it rarely makes the news, but during the monsoon it is the leading recorded cause of death in the data this site draws on, mostly at night in the Terai. The guidance page leads with it for the same reason.",
  },
  {
    q: "Can I use this data or the code?",
    a: "The underlying data belongs to its publishers and each carries its own terms: BIPAD, the USGS, GDACS and NASA are all public sources, and OpenStreetMap data is available under the Open Database Licence. Please credit them rather than this site. For the code or for working together, get in touch.",
  },
] as const;

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faq`,
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-2xl">
        <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
          Questions
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Including the two awkward ones: why these figures are lower than the
          news, and why the feature most people ask for does not exist.
        </p>
      </div>

      <div className="mt-8 max-w-3xl divide-y divide-edge overflow-hidden rounded-lg border border-edge bg-surface">
        {FAQS.map((item) => (
          <details key={item.q} className="group">
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-ink marker:hidden hover:bg-raised sm:px-5">
              <span className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 shrink-0 text-ink-muted transition-transform group-open:rotate-90"
                >
                  ›
                </span>
                {item.q}
              </span>
            </summary>
            <p className="px-4 pb-4 pl-10 text-sm leading-relaxed text-ink-secondary sm:px-5 sm:pl-11">
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-sm text-ink-secondary">
        Something still unclear, or something here wrong? Tell me and I would
        rather fix it than defend it. See the{" "}
        <Link href="/privacy" className="text-ink underline underline-offset-2">
          privacy page
        </Link>{" "}
        for what is and is not collected.
      </p>
    </>
  );
}
