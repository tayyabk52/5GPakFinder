"use client";

import { useEffect } from "react";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { RedditGeneration, RedditMapCollection, RedditMapProperties } from "../types";

const SOURCE = "reddit-speedtests";
const CLUSTERS = "reddit-speed-clusters";
const CLUSTER_COUNT = "reddit-speed-cluster-count";
const POINTS = "reddit-speed-points";
const GLYPH = "reddit-speed-glyph";
const SPEED = "reddit-speed-label";

export function useRedditSpeedLayer({ map, visible, generation, network, onSelect }: { map: MapLibreMap | null; visible: boolean; generation: RedditGeneration; network: string; onSelect: (item: RedditMapProperties | null) => void }) {
  useEffect(() => {
    if (!map) return;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const ensureLayers = () => {
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 46, clusterMaxZoom: 10 });
      if (!map.getLayer(CLUSTERS)) map.addLayer({ id: CLUSTERS, type: "circle", source: SOURCE, filter: ["has", "point_count"], paint: { "circle-color": "#FF4500", "circle-radius": ["step", ["get", "point_count"], 17, 10, 22, 25, 28], "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
      if (!map.getLayer(CLUSTER_COUNT)) map.addLayer({ id: CLUSTER_COUNT, type: "symbol", source: SOURCE, filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: { "text-color": "#ffffff" } });
      if (!map.getLayer(POINTS)) map.addLayer({ id: POINTS, type: "circle", source: SOURCE, filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#FF4500", "circle-radius": 12, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
      if (!map.getLayer(GLYPH)) map.addLayer({ id: GLYPH, type: "symbol", source: SOURCE, filter: ["!", ["has", "point_count"]], layout: { "text-field": "R", "text-size": 11, "text-font": ["Noto Sans Bold"] }, paint: { "text-color": "#ffffff" } });
      if (!map.getLayer(SPEED)) map.addLayer({ id: SPEED, type: "symbol", source: SOURCE, minzoom: 11, filter: ["!", ["has", "point_count"]], layout: { "text-field": ["concat", ["to-string", ["round", ["get", "downloadMbps"]]], " Mbps"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.9], "text-allow-overlap": false }, paint: { "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 2 } });
    };
    const setVisibility = () => [CLUSTERS, CLUSTER_COUNT, POINTS, GLYPH, SPEED].forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none"); });
    const load = async () => {
      if (!map.isStyleLoaded()) return;
      ensureLayers(); setVisibility();
      if (!visible) return;
      const bounds = map.getBounds();
      const minLat = Math.max(23, bounds.getSouth());
      const minLng = Math.max(60, bounds.getWest());
      const maxLat = Math.min(37, bounds.getNorth());
      const maxLng = Math.min(78, bounds.getEast());
      if (minLat >= maxLat || minLng >= maxLng) {
        (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
        return;
      }
      const params = new URLSearchParams({ minLat: String(minLat), minLng: String(minLng), maxLat: String(maxLat), maxLng: String(maxLng), generation });
      if (network) params.set("network", network);
      const response = await fetch(`/api/reddit-speedtests/map?${params}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Could not load Reddit map samples.");
      const data = await response.json() as RedditMapCollection;
      (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(data);
    };
    const schedule = () => { clearTimeout(timeout); timeout = setTimeout(() => void load().catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error); }), 180); };
    const clusterClick = async (event: MapMouseEvent) => { const feature = map.queryRenderedFeatures(event.point, { layers: [CLUSTERS] })[0]; const clusterId = Number(feature?.properties?.cluster_id); const source = map.getSource(SOURCE) as GeoJSONSource; if (Number.isFinite(clusterId)) map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom: await source.getClusterExpansionZoom(clusterId) }); };
    const pointClick = (event: MapMouseEvent) => { const feature = map.queryRenderedFeatures(event.point, { layers: [POINTS] })[0]; if (feature?.properties) onSelect(feature.properties as RedditMapProperties); };
    const enter = () => { map.getCanvas().style.cursor = "pointer"; }; const leave = () => { map.getCanvas().style.cursor = ""; };
    map.on("moveend", schedule); map.on("click", CLUSTERS, clusterClick); map.on("click", POINTS, pointClick); map.on("mouseenter", CLUSTERS, enter); map.on("mouseleave", CLUSTERS, leave); map.on("mouseenter", POINTS, enter); map.on("mouseleave", POINTS, leave);
    schedule();
    return () => { controller.abort(); clearTimeout(timeout); map.off("moveend", schedule); map.off("click", CLUSTERS, clusterClick); map.off("click", POINTS, pointClick); map.off("mouseenter", CLUSTERS, enter); map.off("mouseleave", CLUSTERS, leave); map.off("mouseenter", POINTS, enter); map.off("mouseleave", POINTS, leave); };
  }, [map, visible, generation, network, onSelect]);
}
