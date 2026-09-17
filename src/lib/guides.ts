import type { HazardKind } from "./types";

/**
 * What to do during each hazard, written to hold anywhere in the world.
 *
 * The advice is the widely agreed baseline that national disaster agencies and
 * the Red Cross publish (drop, cover and hold on; turn around at flood water;
 * move to high ground on a coastal quake without waiting for a siren). It is
 * deliberately general. Where local authorities say something different, they
 * win, and every page that shows these says so.
 *
 * `{number}` in a step is replaced with the country's first emergency number,
 * or with "your local emergency number" where none is known.
 */
export interface Guide {
  id: string;
  hazard: string;
  /** Feed hazard kinds this guide answers, used to put active ones first. */
  kinds: HazardKind[];
  when: string;
  during: string[];
  never: string[];
}

export const GUIDES: Guide[] = [
  {
    id: "earthquake",
    hazard: "Earthquake",
    kinds: ["earthquake"],
    when: "Without warning. Aftershocks follow for days.",
    during: [
      "Drop to your hands and knees, cover your head and neck, and hold on to something sturdy.",
      "Stay where you are until the shaking stops. Most injuries happen while moving.",
      "Outside, move to open ground away from buildings, walls and power lines.",
      "Near the coast, once shaking stops, go to high ground at once. Do not wait for a warning.",
    ],
    never: [
      "Do not run outside or use stairs while the ground is shaking.",
      "Do not use a lift.",
      "Do not go back into a damaged building for belongings.",
    ],
  },
  {
    id: "flood",
    hazard: "Flood",
    kinds: ["flood"],
    when: "During heavy rain, and after rain upstream even where it is dry.",
    during: [
      "Move to higher ground as soon as water starts rising. Do not wait to be told.",
      "Take medicine, documents and a charged phone if they are already to hand.",
      "Switch off electricity at the mains if you can do it without touching water.",
      "Follow river and flood warnings from your national weather or disaster agency.",
    ],
    never: [
      "Do not walk through moving water. Ankle-deep flow can knock an adult down.",
      "Do not drive into flood water. Half a metre floats most cars.",
      "Do not shelter in a basement or ground-floor room.",
    ],
  },
  {
    id: "landslide",
    hazard: "Landslide",
    kinds: ["landslide", "avalanche"],
    when: "During and after heavy rain, on and below steep slopes.",
    during: [
      "Move sideways out of the path, then uphill, away from the slide.",
      "Leave at once if you see new cracks in the ground or walls, or tilting trees and poles.",
      "Treat a stream that suddenly turns muddy or stops flowing as a warning.",
      "A rumble that grows louder means debris is already moving. Move across the slope.",
    ],
    never: [
      "Do not sleep below a steep slope during heavy rain.",
      "Do not cross a fresh slide. More material usually follows.",
      "Do not go back to clear debris while rain continues.",
    ],
  },
  {
    id: "cyclone",
    hazard: "Cyclone, hurricane or typhoon",
    kinds: ["cyclone", "storm"],
    when: "Forecast days ahead. The warning is the time to act.",
    during: [
      "Follow evacuation orders as soon as they are given.",
      "If staying, shelter in the strongest room, away from windows.",
      "Keep water, food, medicine, a torch and a charged phone ready.",
      "Wait for an official all-clear before going outside.",
    ],
    never: [
      "Do not go out when the wind suddenly drops. It may be the eye, and the wind returns from the other side.",
      "Do not go near the shore to watch the sea.",
      "Do not touch fallen power lines.",
    ],
  },
  {
    id: "wildfire",
    hazard: "Wildfire",
    kinds: ["fire"],
    when: "Hot, dry and windy days. Fires can move faster than people run.",
    during: [
      "Leave early when authorities advise it. Waiting is what traps people.",
      "Close windows and doors behind you, and wear long cotton or wool clothing.",
      "If you cannot leave, shelter in a solid building away from the approaching fire.",
      "Call {number} if you see a fire that has not been reported.",
    ],
    never: [
      "Do not try to outrun a fire uphill.",
      "Do not drive through smoke you cannot see through.",
      "Do not go back for belongings.",
    ],
  },
  {
    id: "heat",
    hazard: "Extreme heat",
    kinds: ["heatwave", "drought"],
    when: "Heat waves, especially when nights stay hot.",
    during: [
      "Drink water regularly, before you feel thirsty.",
      "Stay in the coolest place you can during the hottest hours.",
      "Check on older neighbours, young children and anyone living alone.",
      "Confusion, hot dry skin or collapse is heatstroke. Call {number} and cool the person with water.",
    ],
    never: [
      "Do not leave anyone, or any animal, in a parked vehicle.",
      "Do not do hard physical work in the midday heat.",
    ],
  },
  {
    id: "lightning",
    hazard: "Lightning",
    kinds: ["lightning"],
    when: "Afternoon storms, especially over open ground and water.",
    during: [
      "Go inside a building or a hard-topped vehicle as soon as you hear thunder.",
      "If thunder follows a flash within 30 seconds, the storm is close enough to strike.",
      "Wait 30 minutes after the last thunder before going back out.",
      "Caught in the open, get off ridges and away from isolated tall trees.",
    ],
    never: [
      "Do not shelter under a lone tree or beside a metal pole.",
      "Do not stay in water or on a boat.",
    ],
  },
  {
    id: "house-fire",
    hazard: "House fire",
    kinds: ["fire", "accident"],
    when: "Most often from cooking, gas cylinders and electrical faults.",
    during: [
      "Get everyone out first, then call {number}.",
      "Stay low, below the smoke, on the way out.",
      "Close doors behind you to slow the fire.",
      "Feel a door with the back of your hand before opening it.",
    ],
    never: [
      "Do not go back inside for anything.",
      "Do not throw water on a cooking-oil or gas fire.",
    ],
  },
  {
    id: "snakebite",
    hazard: "Snakebite",
    kinds: ["animal"],
    when: "Mostly at night and in the rainy season, in and around houses and fields.",
    during: [
      "Keep the person still and calm. Movement spreads venom faster.",
      "Keep the bitten limb still and at or below heart level. Remove rings and bangles.",
      "Call {number} and get to a hospital that stocks antivenom immediately.",
      "Note the time of the bite. Drooping eyelids or trouble breathing are an emergency.",
    ],
    never: [
      "Do not cut the wound or try to suck out venom.",
      "Do not apply a tight tourniquet, ice or herbs.",
      "Do not wait for symptoms before travelling.",
    ],
  },
];

/** Guides for hazards happening now come first; the rest keep their order. */
export function guidesFor(activeKinds: Iterable<HazardKind>): Guide[] {
  const active = new Set(activeKinds);
  const relevant = GUIDES.filter((guide) => guide.kinds.some((kind) => active.has(kind)));
  const rest = GUIDES.filter((guide) => !relevant.includes(guide));
  return [...relevant, ...rest];
}

export function fillNumber(step: string, number: string | null): string {
  return step.replace("{number}", number ?? "your local emergency number");
}

export const KIT = [
  "Drinking water, and a way to make more safe to drink",
  "Food that needs no cooking, for three days",
  "Torch, spare batteries and a charged power bank",
  "First aid kit and a week of any regular medicine",
  "Copies of identity and property documents in a waterproof bag",
  "A whistle, so you can be found if trapped",
  "Some cash in small notes",
  "Sturdy shoes and a dust mask near your bed",
];
