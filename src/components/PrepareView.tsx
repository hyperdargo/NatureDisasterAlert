"use client";

import { useCountry } from "./CountryProvider";
import { CHECKED_ON, headlineNumber, numbersFor } from "@/lib/countries/emergency";
import { GUIDES, KIT, fillNumber } from "@/lib/guides";

/**
 * The guides and kit list, with the reader's country's numbers in them.
 *
 * Deliberately still: this is the page someone reads carefully before
 * anything happens, or fast while it is happening. Neither wants motion.
 */
export function PrepareView() {
  const country = useCountry();
  const numbers = numbersFor(country.code);
  const headline = headlineNumber(numbers);

  return (
    <>
      <section aria-labelledby="numbers-heading" className="mt-10 rounded-3xl border border-edge bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="numbers-heading" className="text-lg font-semibold text-ink">
            Call for help{country.info ? ` in ${country.info.name}` : ""}
          </h2>
          <button type="button" onClick={country.openPicker} className="readout hover:text-ink">
            Change country
          </button>
        </div>
        {numbers ? (
          <>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[...numbers.primary, ...numbers.other].map((line) => (
                <li key={`${line.label}-${line.number}`}>
                  <a
                    href={`tel:${line.number}`}
                    className="press block rounded-2xl border border-edge px-4 py-3 hover:border-edge-strong"
                  >
                    <span className="readout block">{line.label}</span>
                    <span className="display tabular mt-2 block text-3xl">{line.number}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              {numbers.tier === "checked"
                ? `Checked against ${numbers.sourceName} on ${CHECKED_ON}.`
                : "From a public compiled list, not an official source. Confirm locally."}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-secondary">
            {country.code
              ? "No verified emergency numbers for this country. Ask someone local, and on a mobile phone try 112."
              : "Choose a country to see its emergency numbers."}
          </p>
        )}
      </section>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {GUIDES.map((guide) => (
          <article key={guide.id} className="rounded-3xl border border-edge bg-surface p-5 sm:p-7">
            <h2 className="display text-[clamp(1.6rem,3vw,2.2rem)]">{guide.hazard}</h2>
            <p className="mt-2 text-sm text-ink-secondary">{guide.when}</p>

            <h3 className="readout mt-5 text-ink-secondary">Do this</h3>
            <ol className="mt-2 space-y-2">
              {guide.during.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink">
                  <span className="readout tabular mt-0.5 shrink-0 text-ice" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {fillNumber(step, headline?.number ?? null)}
                </li>
              ))}
            </ol>

            <h3 className="readout mt-5 text-critical">Never</h3>
            <ul className="mt-2 space-y-1.5">
              {guide.never.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-secondary">
                  <span className="mt-2.5 h-px w-2.5 shrink-0 bg-critical" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section aria-labelledby="kit-heading" className="mt-10 rounded-3xl border border-edge bg-surface p-5 sm:p-7">
        <h2 id="kit-heading" className="text-lg font-semibold text-ink">
          Keep a bag ready
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Packed so that anyone in the house can carry it out in seconds.
        </p>
        <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {KIT.map((item) => (
            <li key={item} className="border-t border-edge pt-2 text-sm text-ink-secondary">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
