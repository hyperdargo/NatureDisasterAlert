import type { Metadata } from "next";
import { IncidentsView } from "@/components/IncidentsView";
import { WINDOW_DAYS, loadFeedPayload } from "@/lib/feed-page";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Incident log",
  description:
    "Every hazard incident reported in Nepal in the last 30 days, with daily casualty trends and the worst-affected districts.",
};

export default async function IncidentsPage() {
  const initial = await loadFeedPayload();
  return (
    <>
      <div className="mb-6 max-w-2xl">
        <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
          Incident log
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Every report filed in the last {WINDOW_DAYS} days, with the trends and
          the districts behind the numbers.
        </p>
      </div>
      <IncidentsView initial={initial} days={WINDOW_DAYS} />
    </>
  );
}
