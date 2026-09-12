import type { Metadata } from "next";
import { NewsView } from "@/components/NewsView";
import { WINDOW_DAYS, loadFeedPayload } from "@/lib/feed-page";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "News",
  description:
    "Press coverage of disasters in Nepal, and hazards being tracked in other countries.",
};

export default async function NewsPage() {
  const initial = await loadFeedPayload();
  return (
    <>
      <div className="mb-6 max-w-2xl">
        <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
          News
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Coverage of disasters in Nepal, and what is being tracked elsewhere in
          the world.
        </p>
      </div>
      <NewsView initial={initial} days={WINDOW_DAYS} />
    </>
  );
}
