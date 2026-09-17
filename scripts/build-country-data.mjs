/**
 * Build the country data the app ships with.
 *
 *   node scripts/build-country-data.mjs
 *
 * Everything here is derived from public-domain or openly licensed sources and
 * written to src/data/, which is committed. The app never fetches any of it at
 * runtime, so country detection works offline and inside the packaged app.
 *
 *   Natural Earth admin-0 countries (public domain)
 *     -> borders-50m.json    server: which country an event is in
 *     -> borders-110m.json   browser: which country a GPS fix is in
 *     -> countries.json      name, bounding box and label point per country
 *     -> globe.json          land dots for the home-screen globe
 *   IANA tz database zone.tab + backward (public domain)
 *     -> timezones.json      device time zone -> country, the first guess
 *   Wikipedia, "List of emergency telephone numbers" (CC BY-SA 4.0)
 *     -> emergency-compiled.json
 *
 * The Wikipedia table is a compiled list, not an official source. The app
 * labels it that way and lets hand-checked entries in
 * src/lib/countries/emergency.ts override it. See that file before editing.
 *
 * Downloads are cached in .cache/country-data so a rerun is offline.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, ".cache", "country-data");
const outDir = join(root, "src", "data");
mkdirSync(cacheDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const SOURCES = {
  ne50: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
  ne110: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
  zoneTab: "https://raw.githubusercontent.com/eggert/tz/main/zone.tab",
  backward: "https://raw.githubusercontent.com/eggert/tz/main/backward",
  emergency: "https://en.wikipedia.org/api/rest_v1/page/html/List_of_emergency_telephone_numbers",
};

async function source(name) {
  const file = join(cacheDir, name);
  if (existsSync(file)) return readFileSync(file, "utf8");
  console.log(`downloading ${name}`);
  const response = await fetch(SOURCES[name], {
    headers: { "user-agent": "NatureDisasterAlert/0.2 (country data build)" },
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const text = await response.text();
  writeFileSync(file, text);
  return text;
}

const write = (name, value) => {
  const body = JSON.stringify(value);
  writeFileSync(join(outDir, name), body);
  console.log(`wrote src/data/${name} (${(body.length / 1024).toFixed(0)} KB)`);
};

// ---------------------------------------------------------------------------
// Borders
// ---------------------------------------------------------------------------

/** Natural Earth marks a few codes as -99; the _EH column fixes France and Norway. */
function isoOf(properties) {
  for (const key of ["ISO_A2_EH", "ISO_A2", "WB_A2"]) {
    const value = properties[key];
    if (typeof value === "string" && /^[A-Z]{2}$/.test(value)) return value;
  }
  return null;
}

const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;

/** Rings as flat [lon, lat, lon, lat, ...] arrays, rounded, near-duplicates dropped. */
function compactRings(geometry, places) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rings = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const flat = [];
      let lastLon = NaN;
      let lastLat = NaN;
      for (const [lon, lat] of ring) {
        const x = round(lon, places);
        const y = round(lat, places);
        if (x === lastLon && y === lastLat) continue;
        flat.push(x, y);
        lastLon = x;
        lastLat = y;
      }
      if (flat.length >= 6) rings.push(flat);
    }
  }
  return rings;
}

function bboxOf(rings) {
  let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      minLon = Math.min(minLon, ring[i]);
      maxLon = Math.max(maxLon, ring[i]);
      minLat = Math.min(minLat, ring[i + 1]);
      maxLat = Math.max(maxLat, ring[i + 1]);
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

/** Even-odd ray cast over every ring, which handles holes and multipolygons. */
function contains(rings, lon, lat) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function buildBorders(geojson, places) {
  const byIso = new Map();
  for (const feature of geojson.features) {
    const iso = isoOf(feature.properties);
    if (!iso || !feature.geometry) continue;
    const rings = compactRings(feature.geometry, places);
    const existing = byIso.get(iso);
    if (existing) existing.rings.push(...rings);
    else byIso.set(iso, { rings, properties: feature.properties });
  }
  return byIso;
}

const ne50 = buildBorders(JSON.parse(await source("ne50")), 2);
const ne110 = buildBorders(JSON.parse(await source("ne110")), 2);

const borders50 = {};
const borders110 = {};
const countries = {};

for (const [iso, { rings, properties }] of [...ne50].sort(([a], [b]) => a.localeCompare(b))) {
  const bbox = bboxOf(rings);
  borders50[iso] = { b: bbox, r: rings };
  const small = ne110.get(iso);
  // Countries too small for the 110m set fall back to the 50m outline.
  borders110[iso] = small ? { b: bboxOf(small.rings), r: small.rings } : { b: bbox, r: rings };
  countries[iso] = {
    name: properties.NAME_EN ?? properties.NAME ?? properties.ADMIN,
    bbox,
    // Natural Earth's hand-placed label point sits inside the country, unlike
    // a bbox centre, which for Chile or Indonesia lands in the sea.
    center: [round(properties.LABEL_X ?? (bbox[0] + bbox[2]) / 2, 2), round(properties.LABEL_Y ?? (bbox[1] + bbox[3]) / 2, 2)],
  };
}

write("borders-50m.json", borders50);
write("borders-110m.json", borders110);
write("countries.json", countries);

// ---------------------------------------------------------------------------
// Globe land dots
// ---------------------------------------------------------------------------

/**
 * One dot per cell of a near-equal-area grid: rows every STEP degrees, and
 * fewer columns towards the poles so dots do not bunch up there. Each dot
 * records which country it falls in, so the viewer's country can be lit.
 *
 * Output per row: [latIndex, lonCount, lonIndex, countryIndex, lonIndex, ...].
 */
const STEP = 1.8;
const isoList = Object.keys(borders50);
const isoIndex = new Map(isoList.map((iso, index) => [iso, index]));
const entries = Object.entries(borders50);
const rows = [];
let dots = 0;

for (let latIndex = 0; latIndex * STEP < 180; latIndex++) {
  const lat = -90 + STEP / 2 + latIndex * STEP;
  const lonCount = Math.max(1, Math.round((360 / STEP) * Math.cos((lat * Math.PI) / 180)));
  const row = [latIndex, lonCount];
  for (let lonIndex = 0; lonIndex < lonCount; lonIndex++) {
    const lon = -180 + (360 / lonCount) * (lonIndex + 0.5);
    for (const [iso, { b, r }] of entries) {
      if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
      if (contains(r, lon, lat)) {
        row.push(lonIndex, isoIndex.get(iso));
        dots++;
        break;
      }
    }
  }
  if (row.length > 2) rows.push(row);
}

write("globe.json", { step: STEP, countries: isoList, rows });
console.log(`globe: ${dots} land dots`);

// ---------------------------------------------------------------------------
// Time zones
// ---------------------------------------------------------------------------

const timezones = {};
for (const line of (await source("zoneTab")).split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const [code, , zone] = line.split("\t");
  if (code && zone) timezones[zone] = code;
}
// Browsers still report retired names such as Asia/Calcutta and Asia/Katmandu.
for (const line of (await source("backward")).split("\n")) {
  const match = line.match(/^Link\s+(\S+)\s+(\S+)/);
  if (match && timezones[match[1]] && !timezones[match[2]]) {
    timezones[match[2]] = timezones[match[1]];
  }
}
write("timezones.json", timezones);

// ---------------------------------------------------------------------------
// Emergency numbers, compiled list
// ---------------------------------------------------------------------------

const decode = (value) =>
  value
    .replace(/<sup[\s\S]*?<\/sup>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<br\s*\/?>/g, "; ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Names Wikipedia uses that neither Natural Earth nor Intl spell the same way. */
const ALIASES = {
  "ivory coast": "CI",
  "côte d'ivoire": "CI",
  "czech republic": "CZ",
  "east timor": "TL",
  "timor-leste": "TL",
  "republic of the congo": "CG",
  "congo": "CG",
  "democratic republic of the congo": "CD",
  "the gambia": "GM",
  "gambia": "GM",
  "the bahamas": "BS",
  "bahamas": "BS",
  "north korea": "KP",
  "south korea": "KR",
  "eswatini": "SZ",
  "swaziland": "SZ",
  "cape verde": "CV",
  "cabo verde": "CV",
  "burma": "MM",
  "myanmar": "MM",
  "vatican city": "VA",
  "holy see": "VA",
  "palestine": "PS",
  "state of palestine": "PS",
  "federated states of micronesia": "FM",
  "micronesia": "FM",
  "united states": "US",
  "united kingdom": "GB",
  "united arab emirates": "AE",
  "russia": "RU",
  "taiwan": "TW",
  "hong kong": "HK",
  "macau": "MO",
  "macao": "MO",
  "laos": "LA",
  "syria": "SY",
  "iran": "IR",
  "vietnam": "VN",
  "brunei": "BN",
  "moldova": "MD",
  "bolivia": "BO",
  "venezuela": "VE",
  "tanzania": "TZ",
  "kosovo": "XK",
  "north macedonia": "MK",
  "são tomé and príncipe": "ST",
  "sao tome and principe": "ST",
  "saint kitts and nevis": "KN",
  "saint vincent and the grenadines": "VC",
  "saint lucia": "LC",
  "republic of congo": "CG",
  "democratic republic of congo": "CD",
  "curacao": "CW",
  "turks and caicos": "TC",
  "cocos islands": "CC",
  "democratic people's republic of korea": "KP",
  "republic of korea": "KR",
  "republic of china": "TW",
  "turkey": "TR",
  "türkiye": "TR",
};

/**
 * Retired ISO codes that Intl still names. East Germany (DD) is "Germany" and
 * Rhodesia (RH) is "Zimbabwe", and they sort before the real codes, so without
 * this list Germany's numbers were filed under a country that no longer exists.
 */
const RETIRED = new Set(["AN", "BU", "CS", "DD", "DY", "FX", "HV", "NH", "RH", "SU", "TP", "YD", "YU", "ZR"]);

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
const nameToIso = new Map(Object.entries(ALIASES));
// Natural Earth names first: those codes are known to be current.
for (const [iso, { name }] of Object.entries(countries)) {
  if (name && !nameToIso.has(name.toLowerCase())) nameToIso.set(name.toLowerCase(), iso);
}
const allRegions = [];
for (let a = 65; a <= 90; a++) {
  for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    if (RETIRED.has(code)) continue;
    const name = displayNames.of(code);
    if (!name || name === code || /^Unknown/.test(name)) continue;
    allRegions.push(code);
    if (!nameToIso.has(name.toLowerCase())) nameToIso.set(name.toLowerCase(), code);
  }
}

const html = await source("emergency");
const compiled = {};
const unmatched = [];
const tables = html.match(/<table[\s\S]*?<\/table>/g) ?? [];

for (const table of tables) {
  if (!/>\s*Police\s*</.test(table)) continue;
  for (const row of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<t([hd])([^>]*)>([\s\S]*?)<\/t[hd]>/g)].map((m) => ({
      span: Number(m[2].match(/colspan="(\d)"/)?.[1] ?? 1),
      text: decode(m[3]),
    }));
    if (cells.length < 2 || cells[0].text === "Country") continue;

    // Expand colspans so every row reads country, police, ambulance, fire, notes.
    const flat = [];
    for (const cell of cells) for (let i = 0; i < cell.span; i++) flat.push(cell.text);
    const [rawName, police = "", ambulance = "", fire = "", notes = ""] = flat;

    const name = rawName.replace(/\(.*?\)/g, "").trim();
    const iso = nameToIso.get(name.toLowerCase());
    if (!iso) {
      unmatched.push(rawName);
      continue;
    }
    if (compiled[iso]) continue;
    compiled[iso] = { name: rawName, police, ambulance, fire, notes: notes.slice(0, 400) };
  }
}

write("emergency-compiled.json", {
  source: "Wikipedia, List of emergency telephone numbers",
  sourceUrl: "https://en.wikipedia.org/wiki/List_of_emergency_telephone_numbers",
  license: "CC BY-SA 4.0",
  retrieved: new Date().toISOString().slice(0, 10),
  countries: compiled,
});
console.log(`emergency: ${Object.keys(compiled).length} countries matched`);
if (unmatched.length) console.log(`unmatched (not shipped): ${unmatched.join(" | ")}`);

const missing = allRegions.filter((code) => countries[code] && !compiled[code]);
if (missing.length) console.log(`on the map but no compiled numbers: ${missing.join(" ")}`);
