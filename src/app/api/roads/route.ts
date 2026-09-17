import { NextResponse } from "next/server";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { describeError } from "@/lib/fetch-upstream";
import { getFeed } from "@/lib/aggregate";
import { parseQuery } from "@/lib/params";
import { clientKeyFrom, rateLimit } from "@/lib/rate-limit";
import { getRoadAdvisory } from "@/lib/sources/roads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!rateLimit(clientKeyFrom(request.headers)).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: corsHeaders(request) });
  }

  const query = parseQuery(request.url);
  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400, headers: corsHeaders(request) });
  }

  try {
    const feed = await getFeed(query.data.days);
    // Returns immediately. Overpass is refreshed behind the request, because
    // it can take 45 seconds or hang, and a page that waits on it is
    // indistinguishable from a broken one.
    const advisory = getRoadAdvisory(feed.events.filter((e) => e.country === "NP"));
    return NextResponse.json(advisory, {
      headers: {
        // Not cached while warming, or the empty first answer would be served
        // to everyone for an hour.
        "cache-control": advisory.warming
          ? "no-store"
          : "public, s-maxage=3600, stale-while-revalidate=10800",
        ...corsHeaders(request),
      },
    });
  } catch (error) {
    console.error(`road advisory failed: ${describeError(error)}`);
    // Supplementary, and dangerous to guess at, so it simply stays empty.
    return NextResponse.json(
      { roads: [], districts: [], reportedDamage: [], incidentsConsidered: 0, unavailable: true },
      { status: 200, headers: corsHeaders(request) },
    );
  }
}

/** Preflight for the packaged app, which calls this from its own origin. */
export async function OPTIONS(request: Request) {
  return handleOptions(request);
}
