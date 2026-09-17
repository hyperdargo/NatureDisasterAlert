import { NextResponse } from "next/server";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { getNews } from "@/lib/sources/news";
import { CountryParam } from "@/lib/params";
import { clientKeyFrom, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Answers from cache immediately and never waits on the upstream, which takes
 * around 15 seconds to reply. `warming` tells the client the first copy is
 * still on its way and a retry shortly will probably succeed.
 */
export async function GET(request: Request) {
  if (!rateLimit(clientKeyFrom(request.headers)).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: corsHeaders(request) });
  }

  const raw = new URL(request.url).searchParams.get("country");
  const country = raw === null ? { success: true as const, data: "NP" } : CountryParam.safeParse(raw);
  if (!country.success) {
    return NextResponse.json({ error: "Unknown country code." }, { status: 400, headers: corsHeaders(request) });
  }

  const { articles, warming } = getNews(country.data);
  return NextResponse.json(
    { articles, warming, country: country.data, generatedAt: new Date().toISOString() },
    {
      headers: {
        "cache-control": warming
          ? "no-store"
          : "public, s-maxage=900, stale-while-revalidate=3600",
        ...corsHeaders(request),
      },
    },
  );
}

/** Preflight for the packaged app, which calls this from its own origin. */
export async function OPTIONS(request: Request) {
  return handleOptions(request);
}
