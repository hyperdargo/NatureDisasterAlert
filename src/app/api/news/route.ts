import { NextResponse } from "next/server";
import { getNews } from "@/lib/sources/news";
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
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { articles, warming } = getNews();
  return NextResponse.json(
    { articles, warming, generatedAt: new Date().toISOString() },
    {
      headers: {
        "cache-control": warming
          ? "no-store"
          : "public, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
