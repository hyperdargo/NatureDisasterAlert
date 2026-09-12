import type { Metadata } from "next";
import { RoadAdvisory } from "@/components/RoadAdvisory";
import { WINDOW_DAYS } from "@/lib/feed-page";

export const metadata: Metadata = {
  title: "Roads",
  description:
    "Highways in Nepal with a landslide or flood reported nearby. Not a closure list.",
};

export default function RoadsPage() {
  return (
    <>
      <div className="mb-6 max-w-2xl">
        <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
          Roads
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Highways with a landslide or flood reported nearby. Check with Traffic
          Police before you travel.
        </p>
      </div>
      <RoadAdvisory days={WINDOW_DAYS} />
    </>
  );
}
