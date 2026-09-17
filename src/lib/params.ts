import { z } from "zod";
import { isCountryCode } from "./countries";

/**
 * A country code from the query string. Only codes the app has borders for
 * are accepted, so nothing downstream ever sees arbitrary text: it cannot
 * reach a URL, a regular expression or a cache key unchecked.
 */
export const CountryParam = z
  .string()
  .transform((value) => value.toUpperCase())
  .refine(isCountryCode, "Unknown country code.");

/** Query parameters are attacker-controlled; parse, never trust. */
export const FeedQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
  /**
   * Legacy scoping used by Android apps already installed. New clients send
   * `country` instead; when both are absent the answer is Nepal's, which is
   * what those apps expect.
   */
  scope: z.enum(["nepal", "global"]).default("nepal"),
  country: CountryParam.optional(),
});
export type FeedQuery = z.infer<typeof FeedQuery>;

export function parseQuery(url: string) {
  return FeedQuery.safeParse(
    Object.fromEntries(new URL(url).searchParams),
  );
}
