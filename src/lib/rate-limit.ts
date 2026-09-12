/**
 * Fixed-window rate limiter, in process memory.
 *
 * Scope: this protects a single server instance from a single noisy client,
 * which is what a small deployment actually needs. It is NOT a distributed
 * limiter - on multiple instances each holds its own window, so the effective
 * limit multiplies by instance count. Swap the Map for Vercel KV or Upstash
 * Redis before relying on it as an abuse control at scale.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const MAX_TRACKED_CLIENTS = 10_000;

const hits = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(clientKey: string): RateLimitResult {
  const now = Date.now();

  // Opportunistic sweep so the map cannot grow without bound.
  if (hits.size > MAX_TRACKED_CLIENTS) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  const existing = hits.get(clientKey);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    hits.set(clientKey, { count: 1, resetAt });
    return { ok: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  existing.count += 1;
  return {
    ok: existing.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Derive a client key from proxy headers. These are attacker-controllable, so
 * this is a fair-use control, not a security boundary. Only the first hop of
 * x-forwarded-for is used, since later entries are trivially spoofed.
 */
export function clientKeyFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || "unknown";
}
