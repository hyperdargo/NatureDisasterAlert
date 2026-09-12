import { NextResponse } from "next/server";
import { describeError } from "@/lib/fetch-upstream";
import { getFeed } from "@/lib/aggregate";
import { parseQuery } from "@/lib/params";
import { clientKeyFrom, rateLimit } from "@/lib/rate-limit";
import { fetchRoadAdvisory } from "@/lib/sources/roads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!rateLimit(clientKeyFrom(request.headers)).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const query = parseQuery(request.url);
  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  try {
    const feed = await getFeed(query.data.days);
    const advisory = await fetchRoadAdvisory(feed.events.filter((e) => e.inNepal));
    return NextResponse.json(advisory, {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=10800" },
    });
  } catch (error) {
    console.error(`road advisory failed: ${describeError(error)}`);
    // Supplementary, and dangerous to guess at, so it simply stays empty.
    return NextResponse.json(
      { roads: [], districts: [], reportedDamage: [], incidentsConsidered: 0, unavailable: true },
      { status: 200 },
    );
  }
}
