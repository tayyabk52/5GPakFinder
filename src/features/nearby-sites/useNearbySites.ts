"use client";

/**
 * Nearby sites hook.
 * Computes straight-line Haversine distances from the user's location
 * to all loaded site features, sorted nearest first.
 */

import { useMemo } from "react";
import type { CellSiteFeature } from "@/types/cell-site";
import { haversineDistanceKm } from "@/lib/haversine";
import type { GeolocationState } from "@/features/geolocation/useGeolocation";

const MAX_NEARBY_COUNT = 20;
const MAX_NEARBY_RADIUS_KM = 50;

export interface NearbySite {
  feature: CellSiteFeature;
  distanceKm: number;
}

export interface UseNearbySitesReturn {
  nearbySites: NearbySite[];
  isAvailable: boolean;
}

export function useNearbySites(
  features: CellSiteFeature[],
  geoState: GeolocationState,
  activeNetworks: Set<string>
): UseNearbySitesReturn {
  const isAvailable = geoState.status === "granted" && geoState.position !== null;

  const nearbySites = useMemo<NearbySite[]>(() => {
    if (!isAvailable || !geoState.position) return [];

    const userLat = geoState.position.coords.latitude;
    const userLng = geoState.position.coords.longitude;

    const withDistance = features
      .filter((f) => activeNetworks.has(f.properties.provider))
      .map((feature) => {
        const [lon, lat] = feature.geometry.coordinates;
        const distanceKm = haversineDistanceKm(userLat, userLng, lat, lon);
        return { feature, distanceKm };
      })
      .filter(({ distanceKm }) => distanceKm <= MAX_NEARBY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_NEARBY_COUNT);

    return withDistance;
  }, [features, geoState.position, isAvailable, activeNetworks]);

  return { nearbySites, isAvailable };
}
