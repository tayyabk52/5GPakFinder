/**
 * Utility functions for working with cell site data.
 * These transform raw GeoJSON properties into UI-friendly values.
 */

import type { CellSiteProperties } from "@/types/cell-site";
import { inferJazzCity } from "@/config/networks";

/**
 * Derive a display city for a site.
 * - For Zong: use city_source if non-empty
 * - For Jazz: decode from the 3-letter prefix of the site name code
 * - Returns null if neither is resolvable
 */
export function deriveCityForSite(props: CellSiteProperties): string | null {
  if (props.city_source && props.city_source.trim().length > 0) {
    return props.city_source.trim();
  }
  if (props.provider === "Jazz" && props.site_name_source) {
    return inferJazzCity(props.site_name_source);
  }
  return null;
}

/**
 * Format latitude/longitude for display.
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lngStr}`;
}

/**
 * Build a Google Maps directions URL for a site's coordinates.
 */
export function buildDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Build a shareable URL for a specific site.
 */
export function buildSiteShareUrl(siteId: string, origin: string): string {
  return `${origin}/?site=${encodeURIComponent(siteId)}`;
}

/**
 * Format a retrieved_at date string (YYYY-MM-DD) for human display.
 */
export function formatRetrievedDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
