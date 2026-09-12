/**
 * Emergency contacts for Nepal.
 *
 * A warning that governs everything in this file: a wrong number on a disaster
 * page can cost someone their life. So the entries are split by how reliable
 * they are, and the interface shows that split rather than presenting one flat
 * list of equally-trusted numbers.
 *
 *   - `shortCode` entries are national three and four digit numbers. They are
 *     stable, work from any phone anywhere in Nepal, and are the ones to lead
 *     with.
 *   - `organisation` entries are published landlines for response agencies.
 *     They are useful but they do change, they are office lines rather than
 *     emergency lines, and nothing in this app can verify them at runtime.
 *     Each one therefore carries a link to the organisation's own site so a
 *     reader can check it, and the UI labels them as office numbers.
 *
 * Facility-level numbers are deliberately NOT hardcoded here. Those come from
 * OpenStreetMap at runtime, keyed to the reader's actual location.
 */
export interface Contact {
  label: string;
  number: string;
  /** Shown under the label. Say what this line is actually for. */
  note: string;
  verifyUrl?: string;
}

export const SHORT_CODES: Contact[] = [
  { label: "Police", number: "100", note: "Any emergency, any district" },
  { label: "Ambulance", number: "102", note: "Medical emergency and transport" },
  { label: "Fire brigade", number: "101", note: "Fire and rescue" },
  {
    label: "Disaster helpline",
    number: "1149",
    note: "National Disaster Risk Reduction and Management Authority",
  },
  { label: "Traffic police", number: "103", note: "Road incidents and blockages" },
  { label: "Tourist police", number: "1144", note: "Assistance for visitors" },
  { label: "Child helpline", number: "1098", note: "Children at risk" },
];

/**
 * The Red Cross runs much of Nepal's ambulance and blood supply network and is
 * a first responder in most large disasters, so its lines belong here even
 * though they are offices rather than hotlines.
 */
export const ORGANISATIONS: Contact[] = [
  {
    label: "Nepal Red Cross Society",
    number: "+977-1-4270650",
    note: "Headquarters, Kalimati. Ambulance, relief and blood services",
    verifyUrl: "https://nrcs.org",
  },
  {
    label: "Red Cross blood bank",
    number: "+977-1-4225344",
    note: "Central blood transfusion service, Kathmandu",
    verifyUrl: "https://nrcs.org",
  },
  {
    label: "Nepal Ambulance Service",
    number: "+977-1-4427833",
    note: "Kathmandu valley paramedic ambulances",
    verifyUrl: "https://www.nepalambulanceservice.org",
  },
];

/**
 * Snakebite is the single largest cause of recorded death in the current
 * incident data, and it kills through delay rather than through severity. The
 * decisive factor is reaching antivenom quickly, so this is surfaced as an
 * action rather than as a phone number: there is no national snakebite
 * hotline, and sending someone looking for one wastes the time that matters.
 */
export const SNAKEBITE_NOTE = {
  title: "Snakebite",
  body: "There is no snakebite hotline. Call an ambulance on 102 and get to a hospital that stocks antivenom. Keep the person still, keep the bitten limb below heart level, and do not cut, suck or tie the wound.",
} as const;
