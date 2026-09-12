import { NextResponse } from "next/server";
import { describeError } from "@/lib/fetch-upstream";
import { z } from "zod";
import { fetchNearbyServices } from "@/lib/sources/services";
import { clientKeyFrom, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Coordinates arrive already coarsened by the browser to two decimal places.
 * They are validated, used for one lookup, and never written anywhere.
 */
const Query = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export async function GET(request: Request) {
  if (!rateLimit(clientKeyFrom(request.headers)).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const parsed = Query.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  try {
    const services = await fetchNearbyServices(parsed.data.lat, parsed.data.lon);
    return NextResponse.json(
      { services },
      // Cached on the coarse grid cell, so neighbours share one response.
      { headers: { "cache-control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error(`nearby services failed: ${describeError(error)}`);
    return NextResponse.json({ services: [], unavailable: true }, { status: 200 });
  }
}
