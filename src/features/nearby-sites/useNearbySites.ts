"use client";

/**
 * Nearby sites hook.
 * Computes straight-line Haversine distances from the user's location
 * to all loaded site features, sorted nearest first.
 */

import { useMemo } from "react";
import type { CellSiteFeature } from "@/types/cell-site";
import { haversineDistanceKm } from "@/lib/haversine";

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

export interface ActiveLocation {
  latitude: number;
  longitude: number;
}

export function useNearbySites(
  features: CellSiteFeature[],
  activeLocation: ActiveLocation | null,
  activeNetworks: Set<string>
): UseNearbySitesReturn {
  const isAvailable = activeLocation !== null;

  const nearbySites = useMemo<NearbySite[]>(() => {
    if (!isAvailable || !activeLocation) return [];

    const { latitude: userLat, longitude: userLng } = activeLocation;

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
  }, [features, activeLocation, isAvailable, activeNetworks]);

  return { nearbySites, isAvailable };
}
