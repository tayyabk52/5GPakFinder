"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, Popup } from "maplibre-gl";
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

const statusCopy = {
  possible: "Possible issue",
  high_agreement: "High community agreement",
  recovering: "Recovering",
} as const;

function ageLabel(reportedAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(reportedAt).getTime()) / 60_000));
  if (!Number.isFinite(minutes)) return "Recently reported";
  if (minutes < 2) return "Reported just now";
  if (minutes < 60) return `Reported ${minutes} min ago`;
  return `Reported ${Math.round(minutes / 60)} hr ago`;
}

export function useAffectedAreas(map: MapLibreMap | null, visible: boolean, operator?: string) {
  const [cells, setCells] = useState<AffectedCell[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const popup = useRef<Popup | null>(null);

  const refresh = useCallback(async () => {
    if (!map) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const bounds = map.getBounds();
    const query = new URLSearchParams({
      minLat: String(bounds.getSouth()), minLng: String(bounds.getWest()),
      maxLat: String(bounds.getNorth()), maxLng: String(bounds.getEast()),
      zoom: String(map.getZoom()),
    });
    if (operator) query.set("operator", operator);

    try {
      const response = await fetch(`/api/network-status/cells?${query}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load affected areas");
      const data = await response.json();
      if (!controller.signal.aborted) setCells(data.cells ?? []);
    } catch {
      if (controller.signal.aborted) return;
      setCells([]);
    }
  }, [map, operator]);

  useEffect(() => {
    if (!map) return;
    const sync = () => {
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
      timer.current = setTimeout(() => void refresh(), 250);
    };
    map.on("moveend", sync);
    void refresh();
    return () => {
      map.off("moveend", sync);
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
    };
  }, [map, refresh]);

  useEffect(() => {
    if (!map) return;
    let handlersAttached = false;
    const onClick = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const properties = feature.properties ?? {};
      const status = String(properties.status) as keyof typeof statusCopy;
      const count = Number(properties.count) || 0;
      const confidence = Math.round((Number(properties.confidence) || 0) * 100);
      const reportedAt = String(properties.firstReportedAt ?? "");
      const { Popup: MapPopup } = await import("maplibre-gl");

      const card = document.createElement("section");
      card.className = "min-w-52 p-1 text-slate-900";
      const heading = document.createElement("p");
      heading.className = "text-sm font-bold tracking-tight";
      heading.textContent = statusCopy[status] ?? "Community signal";
      const summary = document.createElement("p");
      summary.className = "mt-1 text-xs leading-5 text-slate-600";
      summary.textContent = `${count} community report${count === 1 ? "" : "s"} · ${confidence}% confidence`;
      const timestamp = document.createElement("p");
      timestamp.className = "mt-2 text-xs font-medium text-slate-500";
      timestamp.textContent = ageLabel(reportedAt);
      const note = document.createElement("p");
      note.className = "mt-3 border-t border-slate-100 pt-2 text-[11px] leading-4 text-slate-500";
      note.textContent = "Community signal, not an operator-confirmed outage.";
      card.append(heading, summary, timestamp, note);

      popup.current?.remove();
      popup.current = new MapPopup({ closeButton: true, closeOnClick: true, offset: 16, maxWidth: "250px" })
        .setLngLat(event.lngLat)
        .setDOMContent(card)
        .addTo(map);
    };
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

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
      if (!handlersAttached) {
        map.on("click", coreId, onClick);
        map.on("mouseenter", coreId, onEnter);
        map.on("mouseleave", coreId, onLeave);
        handlersAttached = true;
      }
    };
    add();
    return () => {
      popup.current?.remove();
      popup.current = null;
      if (handlersAttached) {
        map.off("click", coreId, onClick);
        map.off("mouseenter", coreId, onEnter);
        map.off("mouseleave", coreId, onLeave);
      }
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
        firstReportedAt: cell.firstReportedAt,
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
