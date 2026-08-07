"use client";

/**
 * MapLibre GL JS implementation of the MapProvider interface.
 * This is the only file in the app that imports from "maplibre-gl" directly.
 * All other components use the MapProvider interface via context.
 */

import type {
  Map as MapLibreMap,
  GeoJSONSource,
  FilterSpecification,
} from "maplibre-gl";
import type { MapProvider, FlyToOptions, Bounds, MapEventCallback } from "@/types/map-provider";
import type { CellSiteFeatureCollection } from "@/types/cell-site";

export class MapLibreProvider implements MapProvider {
  private map: MapLibreMap;
  public isReady: boolean = false;

  constructor(map: MapLibreMap) {
    this.map = map;
  }

  flyTo(options: FlyToOptions): void {
    this.map.flyTo({
      center: options.center,
      zoom: options.zoom ?? 14,
      speed: options.speed ?? 1.4,
    });
  }

  fitBounds(bounds: Bounds, padding = 60): void {
    this.map.fitBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      { padding }
    );
  }

  setGeoJsonSource(id: string, data: CellSiteFeatureCollection): void {
    const source = this.map.getSource(id);
    if (source) {
      (source as GeoJSONSource).setData(data as GeoJSON.FeatureCollection);
    } else {
      this.map.addSource(id, {
        type: "geojson",
        data: data as GeoJSON.FeatureCollection,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });
    }
  }

  setLayerFilter(layerId: string, filter: unknown): void {
    if (this.map.getLayer(layerId)) {
      this.map.setFilter(layerId, filter as FilterSpecification);
    }
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    if (this.map.getLayer(layerId)) {
      this.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }

  on(event: string, layerId: string | null, callback: MapEventCallback): void {
    if (layerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).on(event, layerId, callback);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).on(event, callback);
    }
  }

  off(event: string, layerId: string | null, callback: MapEventCallback): void {
    if (layerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).off(event, layerId, callback);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).off(event, callback);
    }
  }

  getMapInstance(): MapLibreMap {
    return this.map;
  }
}
