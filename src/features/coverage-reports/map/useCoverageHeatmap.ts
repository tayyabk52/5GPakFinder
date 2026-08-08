"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Popup as MapPopup, MapMouseEvent } from "maplibre-gl";
import type { CoverageCell } from "@/features/coverage-reports/types";
import { cellsToPointFC, cellsToPolygonFC } from "@/features/coverage-reports/map/cellGeoJson";
import { cellPopupHtml } from "@/features/coverage-reports/map/CellStatsPopup";

const SRC_POINTS = "coverage-points";
const SRC_CELLS = "coverage-cells";
const LYR_SURFACE = "coverage-surface";
const LYR_EVIDENCE = "coverage-evidence";
const OUTAGE_HALO_LAYER = "affected-area-signal-halo";
const SITE_CLUSTER_LAYER = "clusters";

interface UseCoverageHeatmapParams {
  map: MapLibreMap | null;
  cells: CoverageCell[];
  mode: "coverage" | "speed";
  visible: boolean;
  filterOp?: "Jazz" | "Zong" | "Ufone";
}

export function useCoverageHeatmap({ map, cells, mode, visible, filterOp }: UseCoverageHeatmapParams) {
  const popupRef = useRef<MapPopup | null>(null);
  const cellsRef = useRef<CoverageCell[]>(cells);
  cellsRef.current = cells;

  useEffect(() => {
    if (!map) {
      return;
    }

    let cancelled = false;

    const ensureLayers = async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled) {
        return;
      }

      if (!map.isStyleLoaded()) {
        map.once("idle", () => {
          void ensureLayers();
        });
        return;
      }

      if (!map.getSource(SRC_POINTS)) {
        map.addSource(SRC_POINTS, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      if (!map.getSource(SRC_CELLS)) {
        map.addSource(SRC_CELLS, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      if (!map.getLayer(LYR_SURFACE)) {
        const before = map.getLayer(OUTAGE_HALO_LAYER)
          ? OUTAGE_HALO_LAYER
          : map.getLayer(SITE_CLUSTER_LAYER)
            ? SITE_CLUSTER_LAYER
            : undefined;
        map.addLayer({
          id: LYR_SURFACE,
          type: "fill",
          source: SRC_CELLS,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["coalesce", ["get", "total"], 0],
              1, 0.4,
              5, 0.7,
              10, 0.9
            ],
          },
        }, before);
      }

      if (!map.getLayer(LYR_EVIDENCE)) {
        const before = map.getLayer(OUTAGE_HALO_LAYER)
          ? OUTAGE_HALO_LAYER
          : map.getLayer(SITE_CLUSTER_LAYER)
            ? SITE_CLUSTER_LAYER
            : undefined;
        map.addLayer({
          id: LYR_EVIDENCE,
          type: "circle",
          source: SRC_POINTS,
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              4, 2,
              11, 4,
              15, 8,
              18, 14
            ],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        }, before);
      }

      const onEnter = (event: MapMouseEvent) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: [LYR_SURFACE] })[0];
        if (!feature) {
          return;
        }

        map.getCanvas().style.cursor = "pointer";
        const prefix = feature.properties?.geohashPrefix as string | undefined;
        const cell = cellsRef.current.find((item) => item.geohashPrefix === prefix);
        if (!cell) {
          return;
        }

        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
          .setLngLat(event.lngLat)
          .setHTML(cellPopupHtml(cell))
          .addTo(map);
      };

      const onLeave = () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
        popupRef.current = null;
      };

      map.on("mousemove", LYR_SURFACE, onEnter);
      map.on("mouseleave", LYR_SURFACE, onLeave);
    };

    void ensureLayers();

    return () => {
      cancelled = true;
      popupRef.current?.remove();

      for (const layerId of [LYR_SURFACE, LYR_EVIDENCE]) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }

      for (const sourceId of [SRC_POINTS, SRC_CELLS]) {
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const syncData = () => {
      const points = map.getSource(SRC_POINTS) as GeoJSONSource | undefined;
      const polygons = map.getSource(SRC_CELLS) as GeoJSONSource | undefined;

      points?.setData(cellsToPointFC(cells, mode, filterOp));
      polygons?.setData(cellsToPolygonFC(cells, mode, filterOp));
    };

    syncData();
  }, [map, cells, mode, filterOp]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const syncVisibility = () => {
      const visibilityValue = visible ? "visible" : "none";

      if (map.getLayer(LYR_SURFACE)) {
        map.setLayoutProperty(LYR_SURFACE, "visibility", visibilityValue);
      }
      if (map.getLayer(LYR_EVIDENCE)) {
        map.setLayoutProperty(LYR_EVIDENCE, "visibility", visibilityValue);
      }
    };

    syncVisibility();
    map.on("zoomend", syncVisibility);
    map.on("moveend", syncVisibility);

    return () => {
      map.off("zoomend", syncVisibility);
      map.off("moveend", syncVisibility);
    };
  }, [map, visible]);
}
