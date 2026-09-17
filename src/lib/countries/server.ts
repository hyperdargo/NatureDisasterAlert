import borders from "@/data/borders-50m.json";
import { allCountries, locateIn, type Borders } from "./index";

/**
 * Server-side country resolution for events.
 *
 * Uses the 50m borders (about 1.2 MB), which stay on the server; the browser
 * gets the lighter 110m set. Imported only by source adapters.
 */
const BORDERS = borders as Borders;

/** Lower-cased names and a few common short forms, longest first. */
const NAME_PATTERNS: Array<[RegExp, string]> = (() => {
  const extra: Array<[string, string]> = [
    ["usa", "US"],
    ["u.s.", "US"],
    ["uk", "GB"],
    ["russia", "RU"],
    ["south korea", "KR"],
    ["north korea", "KP"],
    ["iran", "IR"],
    ["syria", "SY"],
    ["vietnam", "VN"],
    ["laos", "LA"],
    ["taiwan", "TW"],
    ["bolivia", "BO"],
    ["venezuela", "VE"],
    ["tanzania", "TZ"],
    ["dr congo", "CD"],
    ["democratic republic of the congo", "CD"],
    ["myanmar", "MM"],
    ["turkey", "TR"],
    ["czech republic", "CZ"],
    ["micronesia", "FM"],
  ];
  const pairs = [
    ...allCountries().map(({ code, name }) => [name.toLowerCase(), code] as [string, string]),
    ...extra,
  ].sort((a, b) => b[0].length - a[0].length);
  return pairs.map(([name, code]) => [
    new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`, "i"),
    code,
  ]);
})();

/**
 * The country an event belongs to.
 *
 * Borders decide first. Only when a point falls outside every country, which
 * happens for earthquakes and cyclones at sea, is the source's own place text
 * used. Callers pass only the part that names a country: the tail of a USGS
 * place ("120 km SE of Hachijo-jima, Japan") or the first country GDACS lists.
 */
export function countryForEvent(lat: number, lon: number, countryHint?: string | null): string | null {
  const located = locateIn(BORDERS, lat, lon);
  if (located) return located;
  if (!countryHint) return null;
  for (const [pattern, code] of NAME_PATTERNS) {
    if (pattern.test(countryHint)) return code;
  }
  return null;
}
