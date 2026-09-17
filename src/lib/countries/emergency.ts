import compiled from "@/data/emergency-compiled.json";

/**
 * Emergency numbers for every country, and how far each one can be trusted.
 *
 * A wrong number on a disaster page can cost someone their life, so this file
 * never presents one flat list of equally trusted numbers. Every country
 * carries a tier and the interface shows it:
 *
 *   checked   Confirmed against a government or official source, linked in
 *             `sourceUrl`, on the date in CHECKED_ON. These lead.
 *   compiled  Taken from Wikipedia's "List of emergency telephone numbers"
 *             (CC BY-SA 4.0), a well-maintained compiled list that is still
 *             not an official source. Shown with a "confirm locally" label.
 *
 * To promote a country to `checked`, confirm the numbers on an official page,
 * add an entry to CHECKED below with that page as its source, and change
 * CHECKED_ON. Do not promote from memory or from another compiled list.
 *
 * Numbers reach `tel:` links only after `dialable()` strips them to digits, so
 * nothing from the compiled data can inject into a link.
 */
export type Tier = "checked" | "compiled";

export interface Line {
  label: string;
  number: string;
  note?: string;
}

export interface CountryNumbers {
  tier: Tier;
  /** The numbers to show large and first. */
  primary: Line[];
  /** Useful but secondary, or not confirmed to the same standard. */
  other: Line[];
  /** Lines that were published before but could not be re-confirmed. */
  unconfirmed: Line[];
  sourceName: string;
  sourceUrl: string;
  /** Free-text notes from the compiled list, cleaned. */
  notes: string | null;
}

export const CHECKED_ON = "2026-09-17";

const EU_112 = {
  sourceName: "European Commission",
  sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/112",
};

/** EU member states, where 112 reaches every emergency service by law. */
const EU = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

type Checked = Pick<CountryNumbers, "primary" | "sourceName" | "sourceUrl"> &
  Partial<Pick<CountryNumbers, "other" | "unconfirmed">>;

const ALL = "Police, fire and ambulance";

const CHECKED: Record<string, Checked> = {
  NP: {
    primary: [
      { label: "Police", number: "100", note: "Any emergency, any district" },
      { label: "Ambulance", number: "102", note: "Medical emergency and transport" },
      { label: "Fire brigade", number: "101", note: "Fire and rescue" },
      { label: "Traffic police", number: "103", note: "Road incidents and blockages" },
    ],
    unconfirmed: [
      // Shown by this app before, and still widely published, but no official
      // page reachable on CHECKED_ON confirmed them. Kept, and labelled.
      { label: "Disaster helpline", number: "1149" },
      { label: "Tourist police", number: "1144" },
      { label: "Child helpline", number: "1098" },
    ],
    sourceName: "Nepal Police",
    sourceUrl: "https://www.nepalpolice.gov.np/stations/emergency-contacts/",
  },
  IN: {
    primary: [{ label: "All emergencies", number: "112", note: `${ALL}, every state` }],
    sourceName: "Ministry of Home Affairs, ERSS-112",
    sourceUrl: "https://www.mha.gov.in/en/commoncontent/emergency-response-support-system-erss",
  },
  US: {
    primary: [{ label: "All emergencies", number: "911", note: ALL }],
    sourceName: "National 911 Program",
    sourceUrl: "https://www.911.gov/calling-911/",
  },
  CA: {
    primary: [{ label: "All emergencies", number: "911", note: ALL }],
    sourceName: "CRTC",
    sourceUrl: "https://crtc.gc.ca/eng/phone/911/",
  },
  MX: {
    primary: [{ label: "All emergencies", number: "911", note: ALL }],
    sourceName: "Gobierno de México",
    sourceUrl: "https://www.gob.mx/911",
  },
  GB: {
    primary: [{ label: "All emergencies", number: "999", note: ALL }],
    other: [{ label: "NHS non-emergency", number: "111" }],
    sourceName: "NHS",
    sourceUrl: "https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/",
  },
  AU: {
    primary: [
      { label: "Triple Zero", number: "000", note: ALL },
      { label: "From a mobile", number: "112", note: "Reaches Triple Zero; mobile only" },
    ],
    sourceName: "Australian Government",
    sourceUrl: "https://www.infrastructure.gov.au/media-communications/phone/triple-zero",
  },
  NZ: {
    primary: [{ label: "All emergencies", number: "111", note: ALL }],
    other: [{ label: "Police non-emergency", number: "105" }],
    sourceName: "New Zealand Police",
    sourceUrl: "https://www.police.govt.nz/call-111",
  },
  JP: {
    primary: [
      { label: "Police", number: "110" },
      { label: "Fire and ambulance", number: "119" },
    ],
    sourceName: "Japan National Tourism Organization",
    sourceUrl: "https://www.japan.travel/en/plan/emergencies/",
  },
  CN: {
    primary: [
      { label: "Police", number: "110" },
      { label: "Ambulance", number: "120" },
      { label: "Fire", number: "119" },
    ],
    other: [{ label: "Traffic police", number: "122" }],
    sourceName: "Shanghai Municipal Government",
    sourceUrl: "https://english.shanghai.gov.cn/en-EmergencyNumbers/20241210/cbc5280b9f96440a93234bfc5e0c1023.html",
  },
  BD: {
    primary: [{ label: "National emergency service", number: "999", note: ALL }],
    sourceName: "National Emergency Service 999",
    sourceUrl: "https://www.999.gov.bd/",
  },
  PK: {
    primary: [
      { label: "Police", number: "15" },
      { label: "Rescue and ambulance", number: "1122", note: "Rescue 1122" },
    ],
    sourceName: "Rescue 1122",
    sourceUrl: "https://www.rescue.gov.pk/",
  },
  LK: {
    primary: [
      { label: "Police", number: "119" },
      { label: "Ambulance", number: "1990", note: "Suwa Seriya, free on any network" },
    ],
    sourceName: "1990 Suwa Seriya Foundation",
    sourceUrl: "https://www.1990.lk/",
  },
  BT: {
    primary: [
      { label: "Police", number: "113" },
      { label: "Ambulance", number: "112" },
      { label: "Fire", number: "110" },
    ],
    sourceName: "Royal Bhutan Police",
    sourceUrl: "https://rbp.gov.bt/emergency-contacts-helpline-services/",
  },
  PH: {
    primary: [{ label: "All emergencies", number: "911", note: ALL }],
    sourceName: "Emergency 911 National Office",
    sourceUrl: "https://e911.gov.ph/emergency-hotline-numbers/",
  },
  ID: {
    primary: [{ label: "All emergencies", number: "112", note: "Free, works from a locked phone" }],
    sourceName: "Kementerian Komunikasi dan Digital",
    sourceUrl: "https://layanan112.komdigi.go.id/tentang",
  },
  BR: {
    primary: [
      { label: "Police", number: "190" },
      { label: "Ambulance (SAMU)", number: "192" },
      { label: "Fire", number: "193" },
      { label: "Civil defence", number: "199", note: "Floods, landslides, areas at risk" },
    ],
    sourceName: "Ministério das Comunicações",
    sourceUrl: "https://www.gov.br/mcom/pt-br/noticias/noticias_alt/2026/setembro/emergencia-voce-sabe-para-quem-ligar-quando-precisa-de-ajuda",
  },
  ZA: {
    primary: [
      { label: "Police", number: "10111" },
      { label: "Ambulance", number: "10177" },
    ],
    sourceName: "South African Police Service",
    sourceUrl: "https://www.saps.gov.za/services/cc_10111.php",
  },
  TR: {
    primary: [{ label: "All emergencies", number: "112", note: ALL }],
    sourceName: "112 Acil Çağrı Merkezi",
    sourceUrl: "https://www.112.gov.tr/",
  },
  CH: {
    primary: [{ label: "All emergencies", number: "112", note: ALL }],
    ...EU_112,
  },
};

for (const code of EU) {
  CHECKED[code] = {
    primary: [{ label: "All emergencies", number: "112", note: `${ALL}, EU-wide` }],
    ...EU_112,
  };
}

/** Digits only, 2 to 6 of them, or null. The only thing that reaches tel:. */
export function dialable(value: string): string | null {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 2 && digits.length <= 6 ? digits : null;
}

/** "999 or 112" and "115 and 1122" both become separate dialable numbers. */
function numbersIn(raw: string): string[] {
  const found: string[] = [];
  for (const part of raw.split(/\s+(?:or|and)\s+|[/,;]/i)) {
    const token = part.match(/\b\d[\d ]{0,6}\d\b|\b\d{2,6}\b/)?.[0];
    const digits = token ? dialable(token) : null;
    if (digits && !found.includes(digits)) found.push(digits);
  }
  return found;
}

function cleanNotes(raw: string): string | null {
  const text = raw
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}

type CompiledRow = { police: string; ambulance: string; fire: string; notes: string };
const COMPILED = compiled.countries as Record<string, CompiledRow>;

function fromCompiled(row: CompiledRow): Line[] {
  const police = numbersIn(row.police);
  const ambulance = numbersIn(row.ambulance);
  const fire = numbersIn(row.fire);
  const same = (a: string[], b: string[]) => a.join() === b.join();

  if (police.length && same(police, ambulance) && same(police, fire)) {
    return police.map((number, index) =>
      index === 0
        ? { label: "All emergencies", number, note: ALL }
        : { label: "Also answers", number, note: "Listed as an alternative" },
    );
  }
  const lines: Line[] = [];
  const push = (label: string, numbers: string[]) => {
    for (const number of numbers) {
      const existing = lines.find((line) => line.number === number);
      if (existing) existing.label = `${existing.label} and ${label.toLowerCase()}`;
      else lines.push({ label, number });
    }
  };
  push("Police", police);
  push("Ambulance", ambulance);
  push("Fire", fire);
  return lines;
}

export function numbersFor(code: string | null): CountryNumbers | null {
  if (!code) return null;
  const row = COMPILED[code];
  const checked = CHECKED[code];

  if (checked) {
    return {
      tier: "checked",
      primary: checked.primary,
      other: checked.other ?? [],
      unconfirmed: checked.unconfirmed ?? [],
      sourceName: checked.sourceName,
      sourceUrl: checked.sourceUrl,
      notes: row ? cleanNotes(row.notes) : null,
    };
  }

  if (!row) return null;
  const primary = fromCompiled(row);
  if (primary.length === 0) return null;
  return {
    tier: "compiled",
    primary,
    other: [],
    unconfirmed: [],
    sourceName: compiled.source,
    sourceUrl: compiled.sourceUrl,
    notes: cleanNotes(row.notes),
  };
}

/** The first number to put on a big red button. */
export function headlineNumber(numbers: CountryNumbers | null): Line | null {
  return numbers?.primary[0] ?? null;
}

/**
 * What to say when there is nothing for a country. 112 is routed on GSM mobile
 * networks in many countries, which the European Commission states, but it is
 * not guaranteed everywhere, so the wording does not promise it.
 */
export const NO_NUMBERS_FALLBACK = {
  body: "We have no emergency numbers for this country. On a mobile phone, 112 is connected to local emergency services on GSM networks in many countries, but not all. Ask someone nearby for the local number.",
  sourceUrl: EU_112.sourceUrl,
} as const;

export const CHECKED_COUNTRIES = Object.keys(CHECKED);
