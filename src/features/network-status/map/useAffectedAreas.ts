"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AffectedCell } from "@/features/network-status/types";

// Kept as native layers rather than DOM markers so outages stay in one predictable
// layer stack: coverage below, outage signals next, then cell-site and user markers.
const sourceId = "affected-area-signals";
const haloId = "affected-area-signal-halo";
const coreId = "affected-area-signal-core";
const labelId = "affected-area-signal-label";
const siteLayerId = "clusters";

const colorExpression: ExpressionSpecification = [
  "match", ["get", "status"],
  "high_agreement", "#dc2626",
  "recovering", "#0f9488",
  "#f59e0b",
];

export function useAffectedAreas(map: MapLibreMap | null, visible: boolean, operator?: string) {
  const [cells, setCells] = useState<AffectedCell[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!map) return;
    const bounds = map.getBounds();
    const query = new URLSearchParams({
      minLat: String(bounds.getSouth()), minLng: String(bounds.getWest()),
      maxLat: String(bounds.getNorth()), maxLng: String(bounds.getEast()),
      zoom: String(map.getZoom()),
    });
    if (operator) query.set("operator", operator);

    try {
      const response = await fetch(`/api/network-status/cells?${query}`);
      if (!response.ok) throw new Error("Unable to load affected areas");
      const data = await response.json();
      setCells(data.cells ?? []);
    } catch {
      setCells([]);
    }
  }, [map, operator]);

  useEffect(() => {
    if (!map) return;
    const sync = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void refresh(), 250);
    };
    map.on("moveend", sync);
    void refresh();
    return () => {
      map.off("moveend", sync);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [map, refresh]);

  useEffect(() => {
    if (!map) return;
    const add = () => {
      if (!map.isStyleLoaded()) {
        map.once("idle", add);
        return;
      }
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      }

      // Insert before native site layers. This prevents a community signal from
      // covering a tower, a cluster count, or the user's location marker.
      const before = map.getLayer(siteLayerId) ? siteLayerId : undefined;
      if (!map.getLayer(haloId)) {
        map.addLayer({
          id: haloId, type: "circle", source: sourceId,
          paint: {
            "circle-color": colorExpression,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 15, 10, 24, 14, 34, 18, 44],
            "circle-opacity": 0.17,
            "circle-blur": 0.7,
          },
        }, before);
      }
      if (!map.getLayer(coreId)) {
        map.addLayer({
          id: coreId, type: "circle", source: sourceId,
          paint: {
            "circle-color": colorExpression,
            "circle-radius": ["interpolate", ["linear"], ["get", "confidence"], 0, 7, 0.5, 9, 0.8, 12, 1, 14],
            "circle-opacity": 0.95,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.95,
          },
        }, before);
      }
      if (!map.getLayer(labelId)) {
        map.addLayer({
          id: labelId, type: "symbol", source: sourceId, minzoom: 13,
          layout: {
            "text-field": ["to-string", ["get", "count"]],
            "text-size": 11,
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-allow-overlap": false,
            "text-ignore-placement": false,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": colorExpression,
            "text-halo-width": 1.5,
          },
        }, before);
      }
    };
    add();
    return () => {
      for (const id of [labelId, coreId, haloId]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const features = cells.map((cell) => ({
      type: "Feature" as const,
      properties: {
        status: cell.status,
        count: cell.reportCount,
        confidence: cell.confidence,
      },
      geometry: { type: "Point" as const, coordinates: [cell.centerLng, cell.centerLat] },
    }));
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features });
    for (const id of [haloId, coreId, labelId]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }, [map, cells, visible]);

  return { cells, refresh };
}
