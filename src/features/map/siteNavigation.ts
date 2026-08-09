import type { CellSiteFeature } from "@/types/cell-site";

export const MIN_SITE_ZOOM = 14;

export function siteTargetSearchParams(
  current: URLSearchParams,
  feature: CellSiteFeature,
  currentZoom?: number,
) {
  const params = new URLSearchParams(current);
  const [longitude, latitude] = feature.geometry.coordinates;
  const zoom = Number.isFinite(currentZoom)
    ? Math.max(currentZoom as number, MIN_SITE_ZOOM)
    : MIN_SITE_ZOOM;

  params.set("site", feature.properties.site_uid);
  params.set("lat", latitude.toFixed(6));
  params.set("lng", longitude.toFixed(6));
  params.set("zoom", String(zoom));
  return params;
}
