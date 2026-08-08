"use client";

/**
 * NearbySitesPanel — shows nearest 5G sites when location is available.
 * Distance is straight-line (Haversine) — clearly stated in the UI.
 */

import type { NearbySite } from "@/features/nearby-sites/useNearbySites";
import { getNetworkConfig } from "@/config/networks";
import { formatDistance } from "@/lib/haversine";
import { deriveCityForSite } from "@/features/cell-sites/utils/siteUtils";
import type { CellSiteFeature } from "@/types/cell-site";

interface NearbySitesPanelProps {
  nearbySites: NearbySite[];
  isVisible: boolean;
  onSiteSelect: (feature: CellSiteFeature) => void;
  onClose: () => void;
}

export default function NearbySitesPanel({
  nearbySites,
  isVisible,
  onSiteSelect,
  onClose,
}: NearbySitesPanelProps) {
  if (!isVisible) return null;

  return (
    <div
      role="complementary"
      aria-label="Nearby 5G sites"
      className={[
        "map-sheet-enter fixed z-40 bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl",
        // Mobile: bottom sheet above the detail sheet area
        "bottom-0 left-0 right-0 rounded-t-2xl max-h-[50vh] overflow-y-auto",
        // Desktop: inline in left sidebar or separate panel
        "md:bottom-4 md:left-4 md:w-72 md:rounded-xl md:max-h-[calc(100vh-6rem)]",
      ].join(" ")}
    >
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 font-semibold text-sm">Nearby 5G Sites</h2>
          <p className="text-gray-500 text-xs mt-0.5">Straight-line distance · within 50 km</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close nearby sites panel"
          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="py-1">
        {nearbySites.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            No sites found within 50 km of your location.
          </div>
        ) : (
          <ul role="list">
            {nearbySites.map(({ feature, distanceKm }, idx) => {
              const networkConfig = getNetworkConfig(feature.properties.provider);
              const city = deriveCityForSite(feature.properties);
              const distLabel = formatDistance(distanceKm);

              return (
                <li key={feature.properties.site_uid} role="listitem">
                  <button
                    onClick={() => onSiteSelect(feature)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    aria-label={`${feature.properties.display_name}, ${distLabel} away`}
                  >
                    {/* Rank */}
                    <span className="text-gray-400 text-xs w-4 text-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    {/* Color dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: networkConfig?.color ?? "#94A3B8" }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 font-medium truncate">
                        {feature.properties.display_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {networkConfig?.label ?? feature.properties.provider}
                        {city ? ` · ${city}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0 font-mono">
                      {distLabel}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
