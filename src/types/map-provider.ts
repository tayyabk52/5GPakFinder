/**
 * Map provider abstraction interface.
 * All map operations go through this interface so the underlying provider
 * (MapLibre, Google Maps, etc.) can be swapped without touching domain logic.
 */

import type { CellSiteFeatureCollection } from "./cell-site";

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface FlyToOptions {
  center: [number, number]; // [longitude, latitude]
  zoom?: number;
  speed?: number;
}

export type MapEventCallback = (...args: unknown[]) => void;

/**
 * Core map provider interface.
 * Implementations wrap a specific mapping SDK.
 */
export interface MapProvider {
  /** True once the map has fully initialized */
  isReady: boolean;

  /** Pan/zoom to a location */
  flyTo(options: FlyToOptions): void;

  /** Fit the viewport to a bounding box */
  fitBounds(bounds: Bounds, padding?: number): void;

  /**
   * Add or replace a named GeoJSON source.
   * If a source with this id exists, its data is updated in place.
   */
  setGeoJsonSource(id: string, data: CellSiteFeatureCollection): void;

  /**
   * Update the filter expression on a named layer.
   * Used for network visibility filtering.
   */
  setLayerFilter(layerId: string, filter: unknown): void;

  /** Show or hide a named layer */
  setLayerVisibility(layerId: string, visible: boolean): void;

  /** Register a map event listener */
  on(event: string, layerId: string | null, callback: MapEventCallback): void;

  /** Remove a map event listener */
  off(event: string, layerId: string | null, callback: MapEventCallback): void;

  /**
   * Escape hatch for provider-specific operations not covered by the interface.
   * Use sparingly — prefer extending the interface.
   */
  getMapInstance(): unknown;
}
