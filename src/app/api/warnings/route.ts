import { NextResponse } from "next/server";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { profileFor } from "@/lib/countries/profiles";
import { describeError } from "@/lib/fetch-upstream";
import { CountryParam } from "@/lib/params";
import { clientKeyFrom, rateLimit } from "@/lib/rate-limit";
import { getWarnings, hasWarningFeed } from "@/lib/sources/warnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Official warnings for one country, where a national agency publishes them.
 *
 * `available: false` is a real answer, not an error: most countries have no
 * public keyless warning feed, and the interface says so instead of showing
 * an empty list that reads like "no warnings".
 */
export async function GET(request: Request) {
  if (!rateLimit(clientKeyFrom(request.headers)).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: corsHeaders(request) });
  }

  const country = CountryParam.safeParse(new URL(request.url).searchParams.get("country") ?? "");
  if (!country.success) {
    return NextResponse.json({ error: "Unknown country code." }, { status: 400, headers: corsHeaders(request) });
  }

  const official = profileFor(country.data).official;
  if (!official || official.kind !== "warnings" || !hasWarningFeed(official.id)) {
    return NextResponse.json(
      { country: country.data, available: false, warnings: [] },
      { headers: { "cache-control": "public, s-maxage=86400", ...corsHeaders(request) } },
    );
  }

  try {
    const { warnings, fetchedAt } = await getWarnings(official.id);
    return NextResponse.json(
      { country: country.data, available: true, source: official, warnings, fetchedAt },
      {
        headers: {
          "cache-control": "public, s-maxage=120, stale-while-revalidate=600",
          ...corsHeaders(request),
        },
      },
    );
  } catch (error) {
    console.error(`warnings failed (${country.data}): ${describeError(error)}`);
    return NextResponse.json(
      { country: country.data, available: true, unavailable: true, source: official, warnings: [] },
      { status: 503, headers: corsHeaders(request) },
    );
  }
}

/** Preflight for the packaged app, which calls this from its own origin. */
export async function OPTIONS(request: Request) {
  return handleOptions(request);
}
