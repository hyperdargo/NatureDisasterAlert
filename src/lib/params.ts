import { z } from "zod";

/** Query parameters are attacker-controlled; parse, never trust. */
export const FeedQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
  scope: z.enum(["nepal", "global"]).default("nepal"),
});
export type FeedQuery = z.infer<typeof FeedQuery>;

export function parseQuery(url: string) {
  return FeedQuery.safeParse(
    Object.fromEntries(new URL(url).searchParams),
  );
}
