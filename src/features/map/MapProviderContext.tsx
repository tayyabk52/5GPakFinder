"use client";

/**
 * React context that provides the MapProvider instance to child components.
 * Components that need map operations should use useMapProvider() hook.
 */

import { createContext, useContext } from "react";
import type { MapProvider } from "@/types/map-provider";

interface MapProviderContextValue {
  mapProvider: MapProvider | null;
}

export const MapProviderContext = createContext<MapProviderContextValue>({
  mapProvider: null,
});

export function useMapProvider(): MapProvider | null {
  return useContext(MapProviderContext).mapProvider;
}
