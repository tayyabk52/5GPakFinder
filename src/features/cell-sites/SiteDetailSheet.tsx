"use client";

/**
 * SiteDetailSheet — displays details for the selected cell site.
 * Mobile: bottom sheet with slide-up animation
 * Desktop (md+): floating side panel
 *
 * Only displays fields that actually exist in the dataset.
 * No fabricated data is shown.
 */

import { useCallback } from "react";
import type { CellSiteFeature } from "@/types/cell-site";
import { getNetworkConfig } from "@/config/networks";
import {
  deriveCityForSite,
  formatCoordinates,
  buildDirectionsUrl,
  formatRetrievedDate,
} from "@/features/cell-sites/utils/siteUtils";

interface SiteDetailSheetProps {
  feature: CellSiteFeature | null;
  onClose: () => void;
  onCenterOnMap: (feature: CellSiteFeature) => void;
}

export default function SiteDetailSheet({ feature, onClose, onCenterOnMap }: SiteDetailSheetProps) {
  const handleCopyCoords = useCallback(async () => {
    if (!feature) return;
    const [lon, lat] = feature.geometry.coordinates;
    const text = `${lat}, ${lon}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }, [feature]);

  const handleShare = useCallback(async () => {
    if (!feature) return;
    const url = `${window.location.origin}${window.location.pathname}?site=${feature.properties.site_uid}`;
    if (navigator.share) {
      await navigator.share({ title: feature.properties.display_name, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [feature]);

  if (!feature) return null;

  const props = feature.properties;
  const networkConfig = getNetworkConfig(props.provider);
  const city = deriveCityForSite(props);
  const [lon, lat] = feature.geometry.coordinates;
  const coordsDisplay = formatCoordinates(lat, lon);
  const directionsUrl = buildDirectionsUrl(lat, lon);
  const retrievedDate = formatRetrievedDate(props.retrieved_at);
  const markerColor = networkConfig?.color ?? "#94A3B8";

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/10 z-30 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Site details for ${props.display_name}`}
        className={[
          "fixed z-40 bg-white border border-gray-200 shadow-2xl",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 rounded-t-2xl max-h-[70vh] overflow-y-auto",
          // Desktop: right side panel
          "md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-80 md:rounded-xl md:max-h-[calc(100vh-2rem)]",
          "animate-slide-up md:animate-none",
        ].join(" ")}
      >
        {/* Handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden>
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Operator color swatch */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                style={{ backgroundColor: markerColor }}
                aria-hidden
              />
              <div className="min-w-0">
                <h2 className="text-gray-900 font-semibold text-base leading-tight truncate">
                  {props.display_name}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: markerColor }}>
                  {networkConfig?.label ?? props.provider} 5G
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close site details"
              className="flex-shrink-0 ml-2 p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Site info rows */}
          <dl className="space-y-2.5 text-sm">
            <DetailRow label="Site ID" value={props.site_uid} />
            {city && <DetailRow label="City" value={city} />}
            <DetailRow label="Coordinates" value={coordsDisplay} />
            <DetailRow label="Data source" value={props.source_dataset} />
            <DetailRow label="Retrieved" value={retrievedDate} />
            {props.duplicate_coordinate_group && (
              <DetailRow
                label="Note"
                value="Multiple records share this coordinate"
                highlight
              />
            )}
          </dl>

          {/* Accuracy disclaimer */}
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="text-amber-700 font-medium">Data note:</span>{" "}
              {props.accuracy_note}
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => onCenterOnMap(feature)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Center
            </button>
            <button
              onClick={handleCopyCoords}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy coords
            </button>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Directions
            </a>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`text-right font-mono text-xs break-all ${highlight ? "text-amber-700" : "text-gray-700"}`}>
        {value}
      </dd>
    </div>
  );
}
