"use client";

import { Phone } from "@phosphor-icons/react/dist/ssr";
import { useCountry } from "./CountryProvider";
import { openEmergencySheet } from "./home/StatusStage";
import { headlineNumber, numbersFor } from "@/lib/countries/emergency";

/** The country's first emergency number as a full-width call button. */
export function CallButton() {
  const { code } = useCountry();
  const line = headlineNumber(numbersFor(code));
  const className =
    "press mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-alarm text-base font-semibold text-white";
  if (!line) {
    return (
      <button type="button" onClick={openEmergencySheet} className={className}>
        <Phone size={18} weight="fill" aria-hidden />
        Emergency help
      </button>
    );
  }
  return (
    <a href={`tel:${line.number}`} className={className}>
      <Phone size={18} weight="fill" aria-hidden />
      Emergency? Call {line.number}
    </a>
  );
}
