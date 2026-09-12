import { Dashboard } from "@/components/Dashboard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getFeed } from "@/lib/aggregate";
import { computeStats } from "@/lib/stats";

/**
 * The feed is fetched on the server for the first paint, so the page arrives
 * with real hazards already in it rather than a spinner. The client takes over
 * afterwards and refreshes on its own.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW_DAYS = 30;

export default async function HomePage() {
  let feed;
  try {
    feed = await getFeed(WINDOW_DAYS);
  } catch (error) {
    console.error("initial feed failed:", error);
    feed = { events: [], degraded: ["all sources"], generatedAt: new Date().toISOString() };
  }

  const nepal = feed.events.filter((e) => e.inNepal);
  const global = feed.events.filter((e) => !e.inNepal);
  const stats = computeStats(nepal, WINDOW_DAYS);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
            Know what is happening around you
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Live floods, landslides, earthquakes and storms across Nepal, with
            verified casualty figures from the government incident record and
            three international monitoring services.
          </p>
        </div>

        <Dashboard
          days={WINDOW_DAYS}
          initial={{
            nepal,
            global,
            stats,
            degraded: feed.degraded,
            generatedAt: feed.generatedAt,
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
