import { HomeShell } from "@/components/HomeShell";
import { WINDOW_DAYS, loadFeedPayload } from "@/lib/feed-page";

export const revalidate = 120;

export default async function HomePage() {
  const initial = await loadFeedPayload();
  return (
    <>
      <div className="mb-6 max-w-2xl">
        <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
          Know what is happening around you
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Live floods, landslides, earthquakes and storms across Nepal, from the
          government incident record and three international monitoring
          services.
        </p>
      </div>
      <HomeShell initial={initial} days={WINDOW_DAYS} />
    </>
  );
}
