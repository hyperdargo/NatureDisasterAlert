import type { Metadata } from "next";
import { EMERGENCY_NUMBERS } from "@/components/SiteChrome";

export const metadata: Metadata = {
  alternates: { canonical: "/prepare" },
  title: "What to do",
  description:
    "What to do during an earthquake, flood, landslide, lightning storm, fire or snakebite in Nepal, and how to prepare before the monsoon.",
};

interface Guide {
  hazard: string;
  when: string;
  /** Actions in the order they should be taken. */
  during: string[];
  never: string[];
}

/**
 * Guidance is ordered by what the incident record shows actually kills people
 * in Nepal, not by what feels most dramatic. Snakebite leads because it causes
 * more recorded deaths than any other hazard in the current data.
 */
const GUIDES: Guide[] = [
  {
    hazard: "Snakebite",
    when: "Most bites happen at night during the monsoon, in and around houses in the Terai.",
    during: [
      "Keep the person still and calm. Movement moves venom faster.",
      "Immobilise the bitten limb with a splint and keep it at or below heart level.",
      "Remove rings, bangles and watches before swelling starts.",
      "Get to a hospital with antivenom immediately. Carry the person if you can.",
      "Note the time of the bite and watch for drooping eyelids or difficulty breathing.",
    ],
    never: [
      "Do not cut the wound or try to suck out venom.",
      "Do not apply a tight tourniquet.",
      "Do not use ice, herbs or electric shock.",
      "Do not wait to see if symptoms develop before travelling.",
    ],
  },
  {
    hazard: "Landslide",
    when: "During and just after heavy rain, on and below steep slopes.",
    during: [
      "Move sideways out of the slide path, then uphill towards a ridge.",
      "Leave immediately if you see new cracks in the ground or walls, tilting poles or trees.",
      "Treat a sudden change in stream water, turning muddy or stopping entirely, as a warning.",
      "A rumbling sound that grows louder means debris is already moving. Run across the slope.",
    ],
    never: [
      "Do not sleep on the downhill side of a steep slope during heavy monsoon rain.",
      "Do not return to clear debris while rain continues.",
      "Do not cross a fresh slide. More material usually follows.",
    ],
  },
  {
    hazard: "Flood",
    when: "Monsoon months, and after cloudbursts upstream even when it is dry where you are.",
    during: [
      "Move to higher ground as soon as water starts rising. Do not wait for an order.",
      "Take documents, medicine and a charged phone if they are already to hand.",
      "Turn off electricity at the mains if you can do so safely.",
      "Listen for river warnings from the Department of Hydrology and Meteorology.",
    ],
    never: [
      "Do not walk through moving water. Ankle-deep flow can knock an adult down.",
      "Do not drive through a flooded road. Half a metre of water floats most vehicles.",
      "Do not shelter in a basement or low room.",
    ],
  },
  {
    hazard: "Earthquake",
    when: "Without warning. Nepal sits on an active plate boundary.",
    during: [
      "Drop to your knees, cover your head and neck, and hold on to sturdy furniture.",
      "Stay where you are until the shaking stops. Most injuries happen while moving.",
      "If you are outside, move to open ground away from buildings, walls and power lines.",
      "After shaking stops, leave calmly and expect aftershocks.",
    ],
    never: [
      "Do not run outside or use stairs while the ground is shaking.",
      "Do not stand in a doorway. In modern buildings it offers no extra protection.",
      "Do not use a lift.",
      "Do not re-enter a damaged building to collect belongings.",
    ],
  },
  {
    hazard: "Lightning",
    when: "Pre-monsoon and monsoon afternoon storms, especially in open farmland.",
    during: [
      "Go inside a building or a hard-topped vehicle as soon as you hear thunder.",
      "If thunder follows a flash within 30 seconds, the storm is close enough to strike you.",
      "Wait 30 minutes after the last thunder before going back outside.",
      "If caught in the open, move off ridges and away from isolated tall trees.",
    ],
    never: [
      "Do not shelter under a lone tree or beside a metal pole.",
      "Do not stay in water or on a boat.",
      "Do not lie flat on the ground.",
    ],
  },
  {
    hazard: "House fire",
    when: "Most often from cooking fires, gas cylinders and electrical faults.",
    during: [
      "Get everyone out first, then call 101.",
      "Stay low, below the smoke, and crawl to the exit.",
      "Close doors behind you to slow the fire.",
      "Test a door with the back of your hand before opening it.",
    ],
    never: [
      "Do not go back inside for possessions.",
      "Do not throw water on a cooking oil or gas fire.",
      "Do not use a lift.",
    ],
  },
];

const KIT = [
  "Drinking water and a way to purify more",
  "Food that needs no cooking, for three days",
  "Torch, spare batteries and a power bank",
  "First aid kit and one week of any regular medicine",
  "Copies of citizenship, land and bank documents in a waterproof bag",
  "Whistle, so you can be found if trapped",
  "Some cash in small notes",
  "Sturdy shoes and a dust mask near your bed",
];

export default function PreparePage() {
  return (
    <>
        <div className="max-w-2xl">
          <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
            What to do
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            General guidance for the hazards that cause the most harm in Nepal,
            ordered by recorded deaths. In an emergency, instructions from local
            authorities always take precedence over this page.
          </p>
        </div>

        <section
          aria-labelledby="numbers-heading"
          className="mt-8 rounded-lg border border-edge bg-surface p-4 sm:p-5"
        >
          <h2 id="numbers-heading" className="text-sm font-medium text-ink">
            Call for help
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {EMERGENCY_NUMBERS.map((entry) => (
              <li key={entry.number}>
                <a
                  href={`tel:${entry.number}`}
                  className="block rounded border border-edge px-3 py-2.5 transition-colors hover:border-edge-strong"
                >
                  <span className="block text-[11px] text-ink-secondary">{entry.label}</span>
                  <span className="tabular mt-0.5 block text-lg leading-none font-medium text-ink">
                    {entry.number}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {GUIDES.map((guide) => (
            <article
              key={guide.hazard}
              className="rounded-lg border border-edge bg-surface p-4 sm:p-5"
            >
              <h2 className="text-base font-medium text-ink">{guide.hazard}</h2>
              <p className="mt-1 text-xs text-ink-secondary">{guide.when}</p>

              <h3 className="mt-4 text-xs font-medium text-ink">Do this</h3>
              <ol className="mt-2 space-y-1.5">
                {guide.during.map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-sm text-ink-secondary">
                    <span
                      className="tabular mt-px shrink-0 text-xs"
                      style={{ color: "var(--series-1)" }}
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <h3 className="mt-4 text-xs font-medium text-ink">Never</h3>
              <ul className="mt-2 space-y-1.5">
                {guide.never.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-ink-secondary">
                    <span
                      className="mt-2 h-px w-2.5 shrink-0"
                      style={{ background: "var(--status-critical)" }}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section
          aria-labelledby="kit-heading"
          className="mt-10 rounded-lg border border-edge bg-surface p-4 sm:p-5"
        >
          <h2 id="kit-heading" className="text-sm font-medium text-ink">
            Keep ready before the monsoon
          </h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Packed in one bag that anyone in the house can carry out in seconds.
          </p>
          <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {KIT.map((item) => (
              <li
                key={item}
                className="border-t border-edge pt-2 text-sm text-ink-secondary"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
    </>
  );
}
