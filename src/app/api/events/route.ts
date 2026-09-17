import { NextResponse } from "next/server";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { describeError } from "@/lib/fetch-upstream";
import { getFeed } from "@/lib/aggregate";
import { eventsForCountry } from "@/lib/country-feed";
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
        headers: {
          "retry-after": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
          // Even an error needs CORS, or the app sees an opaque network
          // failure instead of the reason it was refused.
          ...corsHeaders(request),
        },
      },
    );
  }

  const query = parseQuery(request.url);
  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400, headers: corsHeaders(request) });
  }
  const { days, scope, country } = query.data;

  try {
    const feed = await getFeed(days);
    // `country` is what the current interface sends. Without it, `scope`
    // keeps the answer that Android apps already installed depend on.
    const events = country
      ? eventsForCountry(feed.events, country)
      : scope === "nepal"
        ? feed.events.filter((e) => e.country === "NP")
        : feed.events;

    return NextResponse.json(
      { ...feed, events, scope, country: country ?? null, days },
      {
        headers: {
          // Serve instantly from the edge, refresh in the background.
          "cache-control": "public, s-maxage=120, stale-while-revalidate=600",
          // Without this the packaged app cannot read the response at all:
          // the browser fetches it, then blocks it, and the app shows an
          // empty map and "no hazards near you".
          ...corsHeaders(request),
        },
      },
    );
  } catch (error) {
    console.error(`feed failed: ${describeError(error)}`);
    return NextResponse.json(
      { error: "Live feed is temporarily unavailable." },
      { status: 503, headers: corsHeaders(request) },
    );
  }
}

/** Preflight for the packaged app, which calls this from its own origin. */
export async function OPTIONS(request: Request) {
  return handleOptions(request);
}
