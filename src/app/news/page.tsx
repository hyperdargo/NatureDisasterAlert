import type { Metadata } from "next";
import { NewsView } from "@/components/NewsView";
import { WINDOW_DAYS } from "@/lib/feed-page";

export const metadata: Metadata = {
  alternates: { canonical: "/news" },
  title: "News",
  description: "Press coverage of disasters in your country, and hazards being tracked around the world.",
};

export default function NewsPage() {
  return (
    <div className="page">
      <div className="mb-10 max-w-3xl">
        <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] text-ink">News</h1>
        <p className="mt-4 text-base text-ink-secondary">
          Coverage of disasters where you are, and what is being tracked elsewhere.
        </p>
      </div>
      <NewsView days={WINDOW_DAYS} />
    </div>
  );
}
