"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { CoverageCell } from "@/features/coverage-reports/types";
import type { NetworkGeneration } from "@/features/coverage-reports/types";
import { fetchCoverageCells } from "@/features/coverage-reports/api/reportsClient";

export function useCoverageCells(map: MapLibreMap | null, verifiedOnly: boolean, generation: NetworkGeneration) {
  const [cells, setCells] = useState<CoverageCell[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!map) {
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const nextCells = await fetchCoverageCells({
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
      zoom,
      verifiedOnly,
      generation,
    }, controller.signal);

    if (!controller.signal.aborted) setCells(nextCells);
  }, [map, verifiedOnly, generation]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const onMoveEnd = () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      request.current?.abort();

      timer.current = setTimeout(() => {
        void refresh();
      }, 300);
    };

    map.on("moveend", onMoveEnd);
    void refresh();

    return () => {
      map.off("moveend", onMoveEnd);
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [map, refresh]);

  return { cells, refresh };
}
