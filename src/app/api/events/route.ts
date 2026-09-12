import { NextResponse } from "next/server";
import { describeError } from "@/lib/fetch-upstream";
import { getFeed } from "@/lib/aggregate";
import { parseQuery } from "@/lib/params";
import { clientKeyFrom, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The browser talks only to this route; it never calls a third-party feed
 * directly. That keeps upstream credentials (if any are ever added) server
 * side, gives every response one validated shape, and means no visitor's
 * request pattern is exposed to four external services.
 */
export async function GET(request: Request) {
  const limit = rateLimit(clientKeyFrom(request.headers));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: { "retry-after": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  const query = parseQuery(request.url);
  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }
  const { days, scope } = query.data;

  try {
    const feed = await getFeed(days);
    const events =
      scope === "nepal" ? feed.events.filter((e) => e.inNepal) : feed.events;

    return NextResponse.json(
      { ...feed, events, scope, days },
      {
        headers: {
          // Serve instantly from the edge, refresh in the background.
          "cache-control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error(`feed failed: ${describeError(error)}`);
    return NextResponse.json(
      { error: "Live feed is temporarily unavailable." },
      { status: 503 },
    );
  }
}
