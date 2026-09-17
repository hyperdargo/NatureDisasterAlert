import type { Metadata } from "next";
import { RoadAdvisory } from "@/components/RoadAdvisory";
import { WINDOW_DAYS } from "@/lib/feed-page";

export const metadata: Metadata = {
  alternates: { canonical: "/roads" },
  title: "Roads",
  description:
    "Highways in Nepal with a landslide or flood reported nearby. Not a closure list.",
};

export default function RoadsPage() {
  return (
    <div className="page">
      <div className="mb-10 max-w-3xl">
        <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] text-ink">Roads</h1>
        <p className="mt-4 text-base text-ink-secondary">
          Highways with a landslide or flood reported nearby. Check with the traffic police
          before you travel.
        </p>
      </div>
      <RoadAdvisory days={WINDOW_DAYS} />
    </div>
  );
}
