import type { FeatureCollection, Point, Polygon } from "geojson";
import type { CoverageCell } from "@/features/coverage-reports/types";
import { geohashBbox } from "@/features/coverage-reports/geohash/geohash";
import { CONFIDENCE_COLORS, SPEED_COLORS } from "@/features/coverage-reports/trust/trustTiers";

export function coverageColor(cell: CoverageCell): string {
  // Without five_g_present 'yes'/'no', every mapped cell is a confirmed 5G cluster.
  if (cell.total < 3) return CONFIDENCE_COLORS.low;
  if (cell.total >= 10) return CONFIDENCE_COLORS["very-high"];
  if (cell.total >= 5) return CONFIDENCE_COLORS.high;
  return CONFIDENCE_COLORS.medium;
}

export function speedColor(cell: CoverageCell, filterOp?: "Jazz" | "Zong" | "Ufone"): string {
  let download = cell.avgDownload;
  if (filterOp === "Jazz") download = cell.jazzAvgDownload;
  else if (filterOp === "Zong") download = cell.zongAvgDownload;
  else if (filterOp === "Ufone") download = cell.ufoneAvgDownload;

  if (download === null || cell.total < 1) {
    return SPEED_COLORS.lowData;
  }

  if (download > 200) return SPEED_COLORS.ultra;
  if (download >= 100) return SPEED_COLORS.veryFast;
  if (download >= 50) return SPEED_COLORS.good;
  if (download >= 20) return SPEED_COLORS.fair;
  return SPEED_COLORS.poor;
}

export function cellsToPointFC(
  cells: CoverageCell[],
  mode: "coverage" | "speed",
  filterOp?: "Jazz" | "Zong" | "Ufone"
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: cells.map((cell) => {
      const color = mode === "coverage" ? coverageColor(cell) : speedColor(cell, filterOp);
      
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [cell.centerLng, cell.centerLat] },
        properties: { color, weight: cell.avgTrust, total: cell.total },
      };
    }),
  };
}

export function cellsToPolygonFC(
  cells: CoverageCell[],
  mode: "coverage" | "speed",
  filterOp?: "Jazz" | "Zong" | "Ufone"
): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: cells.map((cell) => {
      const bounds = geohashBbox(cell.geohashPrefix);
      const color = mode === "coverage" ? coverageColor(cell) : speedColor(cell, filterOp);

      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [bounds.minLon, bounds.minLat],
            [bounds.maxLon, bounds.minLat],
            [bounds.maxLon, bounds.maxLat],
            [bounds.minLon, bounds.maxLat],
            [bounds.minLon, bounds.minLat],
          ]],
        },
        properties: {
          color,
          geohashPrefix: cell.geohashPrefix,
          total: cell.total,
          avgDownload: cell.avgDownload,
          avgTrust: cell.avgTrust,
          jazzCount: cell.jazzCount,
          zongCount: cell.zongCount,
          ufoneCount: cell.ufoneCount,
          jazzAvgDownload: cell.jazzAvgDownload,
          zongAvgDownload: cell.zongAvgDownload,
          ufoneAvgDownload: cell.ufoneAvgDownload,
        },
      };
    }),
  };
}
