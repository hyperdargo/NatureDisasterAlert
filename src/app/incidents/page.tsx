import type { Metadata } from "next";
import { IncidentsView } from "@/components/IncidentsView";
import { WINDOW_DAYS } from "@/lib/feed-page";

export const metadata: Metadata = {
  alternates: { canonical: "/incidents" },
  title: "Incident log",
  description:
    "Every hazard reported in your country in the last 30 days: official warnings where they exist, verified casualty figures for Nepal, and everything the global monitors track.",
};

export default function IncidentsPage() {
  return (
    <div className="page">
      <div className="mb-10 max-w-3xl">
        <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] text-ink">Incident log</h1>
        <p className="mt-4 text-base text-ink-secondary">
          Everything reported in the last {WINDOW_DAYS} days, with what each source can and cannot
          tell you.
        </p>
      </div>
      <IncidentsView days={WINDOW_DAYS} />
    </div>
  );
}
