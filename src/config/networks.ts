/**
 * Network (operator) configuration registry.
 *
 * This is the single source of truth for all operator metadata.
 * Adding a new operator (e.g. Ufone) requires only adding an entry here
 * and providing the corresponding dataset — no UI component changes needed.
 *
 * Colors are chosen to be:
 * - Visually distinct from each other
 * - Readable on both light and dark map backgrounds
 * - Accessible (WCAG AA contrast against the map layer)
 */

export interface NetworkConfig {
  /** Exact provider string as it appears in the dataset's "provider" field */
  id: string;
  /** Human-readable display label */
  label: string;
  /** Primary marker/filter color — hex */
  color: string;
  /** Lighter variant for cluster halos or selected state */
  colorLight: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  Jazz: {
    id: "Jazz",
    label: "Jazz",
    color: "#EF4444",      // Red
    colorLight: "#F87171",
  },
  Zong: {
    id: "Zong",
    label: "Zong",
    color: "#22C55E",      // Green
    colorLight: "#4ADE80",
  },
  "Ufone / Onic": {
    id: "Ufone / Onic",
    label: "Ufone / Onic",
    color: "#A855F7",      // Purple
    colorLight: "#D8B4FE",
  },
  // Future operators: add an entry here, provide data file, run data:build
  // Telenor: {
  //   id: "Telenor",
  //   label: "Telenor",
  //   color: "#0065BD",
  //   colorLight: "#3B82F6",
  // },
};

/** Ordered list of network IDs for consistent UI rendering */
export const NETWORK_IDS = Object.keys(NETWORKS);

/** Utility: get config for a provider string, returns undefined if unknown */
export function getNetworkConfig(provider: string): NetworkConfig | undefined {
  return NETWORKS[provider];
}

/** Fallback color for any operator not yet in the registry */
export const UNKNOWN_OPERATOR_COLOR = "#94A3B8";

/**
 * Jazz site name prefix → city lookup.
 * Jazz KML does not include a city field, but the first 3 letters of the
 * site name encode the city (confirmed by the dataset owner).
 * Data source: review of actual site codes appearing in jazz_5g_sites_clean.csv
 *              and commonly known Pakistani telecom city code conventions.
 */
export const JAZZ_CITY_PREFIX_MAP: Record<string, string> = {
  ISB: "Islamabad",
  RWP: "Rawalpindi",
  LHR: "Lahore",
  KHI: "Karachi",
  FSD: "Faisalabad",
  MUL: "Multan",
  GUJ: "Gujranwala",
  // Note: GUJ appears in dataset near coordinates for Gujranwala/Gujrat area
  PSH: "Peshawar",
  PEW: "Peshawar",
  QTA: "Quetta",
  ABT: "Abbottabad",
  SKT: "Sialkot",
  HYD: "Hyderabad",
  SHI: "Sheikhupura",
  SHU: "Sheikhupura",
  SWB: "Swabi",
  MRD: "Mardan",
  BTL: "Bahawalpur",
  BWP: "Bahawalpur",
  SWL: "Sahiwal",
  SHW: "Sahiwal",
  JHL: "Jhelum",
  GJT: "Gujrat",
  CHK: "Chakwal",
  ATK: "Attock",
  MNS: "Mianwali",
  VHR: "Vehari",
  OKR: "Okara",
  DGK: "Dera Ghazi Khan",
  RHM: "Rahim Yar Khan",
  KSR: "Kasur",
  NWS: "Nowshera",
  HRR: "Haripur",
  SCH: "Sanghar",
  SJW: "Sujawal",
  TLH: "Talagang",
  HAF: "Hafizabad",
  MBN: "Mandi Bahauddin",
  CHN: "Chiniot",
  JPB: "Jhang",
  JNG: "Jhang",
  SUK: "Sukkur",
  RYK: "Rahim Yar Khan",
  RUR: "Rural",  // Jazz rural / unclassified area sites
};

/**
 * Infer city for a Jazz site from its name prefix.
 * Returns null if the prefix is not in our lookup table.
 */
export function inferJazzCity(siteName: string): string | null {
  if (!siteName || siteName.length < 3) return null;
  const prefix = siteName.slice(0, 3).toUpperCase();
  return JAZZ_CITY_PREFIX_MAP[prefix] ?? null;
}
