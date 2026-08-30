export const SITE_DATASET = {
  name: "Pakistan provider-published 5G site locations",
  totalSites: 932,
  retrievedAt: "2026-08-07",
  providers: [
    {
      name: "Jazz",
      count: 538,
      sourceName: "Jazz official 5G KML point placemarks",
      sourceUrl: "https://jazz.com.pk/KML_Coverage_map/5G_Active_Sites_with_Overlay.kml",
      accuracy: "Coordinates published in the provider KML; not independently surveyed.",
    },
    {
      name: "Zong",
      count: 301,
      sourceName: "Zong official 5G coverage map LOCS array",
      sourceUrl: "https://www.zong.com.pk/5g-coverage-map",
      accuracy: "Coordinates published in the provider map source; not independently surveyed.",
    },
    {
      name: "Ufone / Onic",
      count: 93,
      sourceName: "Ufone / Onic official site list",
      sourceUrl: "https://www.ufone.com/5g/",
      accuracy: "Locations geocoded from provider data and should be treated as approximate.",
    },
  ],
} as const;
