"use client";

/**
 * MainMapView — the primary client component that assembles all map features.
 * This is the heart of the application, wiring together:
 * - The map
 * - Network filters
 * - Search
 * - Geolocation
 * - Site selection
 * - Nearby sites
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { CellSiteFeature } from "@/types/cell-site";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useNetworkFilters } from "@/features/filters/useNetworkFilters";
import { useGeolocation } from "@/features/geolocation/useGeolocation";
import { useNearbySites } from "@/features/nearby-sites/useNearbySites";
import { useSearch, type SearchResult } from "@/features/search/useSearch";
import NetworkFilterBar from "@/features/filters/NetworkFilterBar";
import SearchBar from "@/features/search/SearchBar";
import LocateMeButton from "@/features/geolocation/LocateMeButton";
import MapLegend from "@/features/map/MapLegend";
import SiteDetailSheet from "@/features/cell-sites/SiteDetailSheet";
import NearbySitesPanel from "@/features/nearby-sites/NearbySitesPanel";
import ReportButton from "@/features/coverage-reports/components/ReportButton";
import ReportSheet from "@/features/coverage-reports/components/ReportSheet";
import HeatmapLegend, { type HeatmapMode } from "@/features/coverage-reports/map/HeatmapLegend";
import { useCoverageCells } from "@/features/coverage-reports/hooks/useCoverageCells";
import { useCoverageHeatmap } from "@/features/coverage-reports/map/useCoverageHeatmap";
import type { ReportPin } from "@/features/map/MapContainer";

// Dynamic import: MapContainer is never SSR'd (MapLibre requires browser)
const MapContainer = dynamic(() => import("@/features/map/MapContainer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading map…</p>
      </div>
    </div>
  ),
});

export default function MainMapView() {
  const [allFeatures, setAllFeatures] = useState<CellSiteFeature[]>([]);
  const [selectedSite, setSelectedSite] = useState<CellSiteFeature | null>(null);
  const [showNearby, setShowNearby] = useState(false);
  const [coverageMap, setCoverageMap] = useState<MapLibreMap | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPin, setReportPin] = useState<ReportPin | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("coverage");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [heatmapVisible] = useState(true);
  const mapRef = useState<{ flyTo: (f: CellSiteFeature) => void } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { activeNetworks, toggleNetwork } = useNetworkFilters();
  const geoState = useGeolocation();
  const { nearbySites, isAvailable: hasLocation } = useNearbySites(allFeatures, geoState, activeNetworks);
  const { query, setQuery, results, isSearching, clearSearch } = useSearch(allFeatures);
  const { cells, refresh: refreshCells } = useCoverageCells(coverageMap, verifiedOnly);

  // Auto-fetch location on initialization
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (geoState.status === "idle") {
      geoState.requestLocation();
    }
  }, []);

  const filterOp = useMemo(() => {
    if (activeNetworks.size === 1) {
      const val = Array.from(activeNetworks)[0];
      if (["Jazz", "Zong", "Ufone"].includes(val)) return val as "Jazz" | "Zong" | "Ufone";
    }
    return undefined;
  }, [activeNetworks]);

  useCoverageHeatmap({ map: coverageMap, cells, mode: heatmapMode, visible: heatmapVisible, filterOp });

  // ── Site counts per network ───────────────────────────────────────────────────
  const siteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of allFeatures) {
      const p = f.properties.provider;
      counts[p] = (counts[p] ?? 0) + 1;
    }
    return counts;
  }, [allFeatures]);

  // ── Map fly-to ref ────────────────────────────────────────────────────────────
  const flyToSiteRef = useState<((f: CellSiteFeature) => void) | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSiteSelect = useCallback((feature: CellSiteFeature | null) => {
    setSelectedSite(feature);
    if (!feature) {
      // Clear site URL param
      const params = new URLSearchParams(searchParams.toString());
      params.delete("site");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  const handleFeaturesLoaded = useCallback((features: CellSiteFeature[]) => {
    setAllFeatures(features);
  }, []);

  const handleSearchResult = useCallback((result: SearchResult) => {
    if (result.type === "cell-site") {
      const feature = result.feature;
      setSelectedSite(feature);
      const params = new URLSearchParams(searchParams.toString());
      params.set("site", feature.properties.site_uid);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      // It's a geocoded location
      const coords = result.feature.geometry.coordinates; // [lon, lat]
      const params = new URLSearchParams(searchParams.toString());
      params.set("lng", coords[0].toFixed(6));
      params.set("lat", coords[1].toFixed(6));
      params.set("zoom", "15");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  const handleLocate = useCallback(() => {
    geoState.requestLocation();
  }, [geoState]);

  const handleFlyToUser = useCallback(() => {
    if (geoState.position) {
      const { latitude, longitude } = geoState.position.coords;
      // We trigger via a side-channel: set a URL param that MapContainer watches
      const params = new URLSearchParams(searchParams.toString());
      params.set("lat", latitude.toFixed(6));
      params.set("lng", longitude.toFixed(6));
      params.set("zoom", "13");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [geoState.position, searchParams, router, pathname]);

  const totalVisible = useMemo(() => {
    return allFeatures.filter((f) => activeNetworks.has(f.properties.provider)).length;
  }, [allFeatures, activeNetworks]);

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-gray-50">
      {/* ── Full-screen map ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <MapContainer
          onSiteSelect={handleSiteSelect}
          selectedSiteId={selectedSite?.properties.site_uid ?? null}
          activeNetworks={activeNetworks}
          userPosition={geoState.position}
          onFeaturesLoaded={handleFeaturesLoaded}
          onMapReady={setCoverageMap}
          reportPin={reportPin}
          onReportPinChange={setReportPin}
        />
      </div>

      {/* ── Top controls overlay ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 safe-area-inset-top pointer-events-none flex flex-col gap-3">
        
        {/* Row 1: Search + Locate */}
        <div className="flex gap-3 items-center pointer-events-auto w-full max-w-full">
          <div className="flex-1 min-w-0">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              results={results}
              isSearching={isSearching}
              onSelectResult={handleSearchResult}
              onClear={clearSearch}
            />
          </div>
          <div className="flex-shrink-0">
            <LocateMeButton
              status={geoState.status}
              onLocate={handleLocate}
              onFlyToUser={handleFlyToUser}
            />
          </div>
        </div>

        {/* Row 2: Overflowing Filter Chips */}
        <div className="w-full pointer-events-auto overflow-hidden">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            <NetworkFilterBar
              activeNetworks={activeNetworks}
              onToggleNetwork={toggleNetwork}
              siteCounts={siteCounts}
            />
            {allFeatures.length > 0 && (
              <div className="px-4 py-2 rounded-full bg-white text-gray-500 text-[13px] font-medium shadow-[0_4px_14px_rgba(0,0,0,0.04)] whitespace-nowrap flex-shrink-0 ml-1 border border-gray-100">
                {totalVisible.toLocaleString()} sites
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom controls container ────────────────────────────────────────── */}
      {/* 1. Layers & Legend controls (bottom right) */}
      <div className="absolute bottom-[130px] sm:bottom-28 right-4 z-20 flex flex-col gap-3 items-end pointer-events-auto">
        {/* Nearby toggle (only when location is available) */}
        {hasLocation && (
          <button
            id="nearby-toggle"
            onClick={() => setShowNearby((v) => !v)}
            aria-label={showNearby ? "Hide nearby sites" : "Show nearby sites"}
            aria-pressed={showNearby}
            className={[
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all shadow-lg",
              showNearby
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-white/90 backdrop-blur-md border-gray-300/70 text-gray-700 hover:text-gray-900 hover:bg-white",
            ].join(" ")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="hidden sm:inline">Nearby</span>
            {nearbySites.length > 0 && (
              <span className="text-xs opacity-75">{nearbySites.length}</span>
            )}
          </button>
        )}

        <HeatmapLegend
          mode={heatmapMode}
          verifiedOnly={verifiedOnly}
          onToggleMode={setHeatmapMode}
          onToggleVerified={() => setVerifiedOnly((value) => !value)}
        />
        <MapLegend />
      </div>

      {/* 2. Floating Action Button (bottom center) */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 safe-area-inset-bottom">
        <ReportButton onClick={() => setReportOpen(true)} />
      </div>

      {/* ── Geolocation error message ─────────────────────────────────────────── */}
      {geoState.errorMessage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-xs text-amber-700 shadow-xl max-w-xs text-center"
        >
          {geoState.errorMessage}
        </div>
      )}

      {/* ── Site detail sheet ─────────────────────────────────────────────────── */}
      <SiteDetailSheet
        feature={selectedSite}
        onClose={() => handleSiteSelect(null)}
        onCenterOnMap={(feature) => {
          // MapContainer handles this via URL param watch
          const [lon, lat] = feature.geometry.coordinates;
          const params = new URLSearchParams(searchParams.toString());
          params.set("lat", lat.toFixed(6));
          params.set("lng", lon.toFixed(6));
          params.set("zoom", "15");
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
      />

      {/* ── Nearby sites panel ────────────────────────────────────────────────── */}
      <NearbySitesPanel
        nearbySites={nearbySites}
        isVisible={showNearby && hasLocation}
        onSiteSelect={(feature) => {
          handleSiteSelect(feature);
          setShowNearby(false);
        }}
        onClose={() => setShowNearby(false)}
      />

      <ReportSheet
        open={reportOpen}
        onClose={() => {
          setReportPin(null);
          setReportOpen(false);
        }}
        onSubmitSuccess={refreshCells}
        adjustedPin={reportPin}
        onStartPinAdjustment={(originLatitude, originLongitude) => {
          setReportPin({ latitude: originLatitude, longitude: originLongitude, originLatitude, originLongitude });
        }}
        onStopPinAdjustment={() => setReportPin(null)}
      />
    </div>
  );
}
