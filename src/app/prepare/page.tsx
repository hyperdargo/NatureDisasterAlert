import type { Metadata } from "next";
import { PrepareView } from "@/components/PrepareView";

export const metadata: Metadata = {
  alternates: { canonical: "/prepare" },
  title: "What to do",
  description:
    "What to do during an earthquake, flood, landslide, cyclone, wildfire, heat wave, lightning storm, house fire or snakebite, with your country's emergency numbers.",
};

export default function PreparePage() {
  return (
    <div className="page">
      <div className="max-w-3xl">
        <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] text-ink">What to do</h1>
        <p className="mt-4 text-base text-ink-secondary">
          General guidance that holds almost anywhere. In an emergency, instructions from local
          authorities always come before this page.
        </p>
      </div>
      <PrepareView />
    </div>
  );
}
