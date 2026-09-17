import { HomeView } from "@/components/HomeView";
import { WINDOW_DAYS } from "@/lib/feed-page";

/**
 * Static. The server cannot know the visitor's country, so the page ships no
 * feed snapshot and the browser fetches for the right country on its first
 * render. It also means no build can bake stale or empty data into the page.
 */
export default function HomePage() {
  return <HomeView days={WINDOW_DAYS} />;
}
