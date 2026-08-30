export const SITE_DATASET = {
  name: "Pakistan provider-published 5G site locations",
  totalSites: 932,
  retrievedAt: "2026-08-07",
  reviewedAt: "2026-08-30",
  providers: [
    {
      name: "Jazz",
      count: 538,
      sourceName: "Jazz official 5G KML point placemarks",
      sourceUrl: "https://jazz.com.pk/KML_Coverage_map/5G_Active_Sites_with_Overlay.kml",
      accuracy: "Coordinates published in the provider KML; not independently surveyed.",
      sourceReview: "Rechecked 30 August 2026: the official KML still contained 538 Point placemarks.",
    },
    {
      name: "Zong",
      count: 301,
      sourceName: "Zong official 5G coverage map LOCS array",
      sourceUrl: "https://www.zong.com.pk/5g-coverage-map",
      accuracy: "Coordinates published in the provider map source; not independently surveyed.",
      sourceReview: "Rechecked 30 August 2026: the map source still contained 301 LOCS records. Its visible banner said 304 sites, so 5GPak reports the auditable record count rather than the banner claim.",
    },
    {
      name: "Ufone / Onic",
      count: 93,
      sourceName: "Ufone / Onic official site list",
      sourceUrl: "https://www.ufone.com/5g/",
      accuracy: "Locations geocoded from provider data and should be treated as approximate.",
      sourceReview: "Rechecked 30 August 2026: the original source URL returned 404. The dated snapshot is retained with this limitation visible.",
    },
  ],
} as const;
