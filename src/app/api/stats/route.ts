import { NextResponse } from "next/server";
import { describeError } from "@/lib/fetch-upstream";
import { getFeed } from "@/lib/aggregate";
import { parseQuery } from "@/lib/params";
import { clientKeyFrom, rateLimit } from "@/lib/rate-limit";
import { computeStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = rateLimit(clientKeyFrom(request.headers));
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const query = parseQuery(request.url);
  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }
  const { days } = query.data;

  try {
    const feed = await getFeed(days);
    const nepalEvents = feed.events.filter((e) => e.inNepal);
    return NextResponse.json(
      { ...computeStats(nepalEvents, days), days, generatedAt: feed.generatedAt },
      { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (error) {
    console.error(`stats failed: ${describeError(error)}`);
    return NextResponse.json(
      { error: "Statistics are temporarily unavailable." },
      { status: 503 },
    );
  }
}
