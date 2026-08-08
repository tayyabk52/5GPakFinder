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

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { CellSiteFeature } from "@/types/cell-site";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useNetworkFilters } from "@/features/filters/useNetworkFilters";
import { useGeolocation } from "@/features/geolocation/useGeolocation";
import { useNearbySites, type ActiveLocation } from "@/features/nearby-sites/useNearbySites";
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
import { useAffectedAreas } from "@/features/network-status/map/useAffectedAreas";

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
  const [sessionLocation, setSessionLocation] = useState<ActiveLocation | null>(null);
  const [isAdjustingLocation, setIsAdjustingLocation] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("coverage");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [affectedVisible, setAffectedVisible] = useState(true);
  const hasAutoCenteredOnLocation = useRef(false);
  const centerAfterLocate = useRef(false);
  const mapRef = useState<{ flyTo: (f: CellSiteFeature) => void } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { activeNetworks, toggleNetwork } = useNetworkFilters();
  const geoState = useGeolocation();
  const gpsLocation = useMemo<ActiveLocation | null>(() => geoState.position
    ? { latitude: geoState.position.coords.latitude, longitude: geoState.position.coords.longitude }
    : null, [geoState.position]);
  const activeLocation = sessionLocation ?? gpsLocation;
  const { nearbySites, isAvailable: hasLocation } = useNearbySites(allFeatures, activeLocation, activeNetworks);
  const { query, setQuery, results, isSearching, clearSearch } = useSearch(allFeatures);
  const { cells, refresh: refreshCells } = useCoverageCells(coverageMap, verifiedOnly);

  // Auto-fetch location on initialization
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (geoState.status === "idle") {
      geoState.requestLocation();
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("adjusted-map-location");
    if (!saved) return;
    try {
      const location = JSON.parse(saved) as ActiveLocation;
      if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
        setSessionLocation(location);
      }
    } catch {
      sessionStorage.removeItem("adjusted-map-location");
    }
  }, []);

  // Make the map's normal location available to other session features, such
  // as Network Status, without requiring a second picker flow.
  useEffect(() => {
    if (!gpsLocation || sessionLocation) return;
    sessionStorage.setItem("adjusted-map-location", JSON.stringify(gpsLocation));
  }, [gpsLocation, sessionLocation]);

  // Center only once when the initial GPS reading arrives. Location watchers can
  // refine coordinates afterwards, but should never pull the map away from where
  // the user is exploring.
  useEffect(() => {
    if (!gpsLocation || sessionLocation || hasAutoCenteredOnLocation.current) return;

    const hasExplicitMapTarget = searchParams.has("site") || (searchParams.has("lat") && searchParams.has("lng"));
    if (hasExplicitMapTarget) {
      hasAutoCenteredOnLocation.current = true;
      return;
    }

    hasAutoCenteredOnLocation.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.set("lat", gpsLocation.latitude.toFixed(6));
    params.set("lng", gpsLocation.longitude.toFixed(6));
    params.set("zoom", "13");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [gpsLocation, pathname, router, searchParams, sessionLocation]);

  const saveSessionLocation = useCallback((pin: ReportPin) => {
    const location = { latitude: pin.latitude, longitude: pin.longitude };
    setSessionLocation(location);
    sessionStorage.setItem("adjusted-map-location", JSON.stringify(location));
  }, []);

  const startLocationAdjustment = useCallback(() => {
    if (!activeLocation) return;
    setReportPin({
      latitude: activeLocation.latitude,
      longitude: activeLocation.longitude,
      originLatitude: activeLocation.latitude,
      originLongitude: activeLocation.longitude,
    });
    setIsAdjustingLocation(true);
  }, [activeLocation]);


  const filterOp = useMemo(() => {
    if (activeNetworks.size === 1) {
      const val = Array.from(activeNetworks)[0];
      if (["Jazz", "Zong", "Ufone"].includes(val)) return val as "Jazz" | "Zong" | "Ufone";
    }
    return undefined;
  }, [activeNetworks]);

  useCoverageHeatmap({ map: coverageMap, cells, mode: heatmapMode, visible: heatmapVisible, filterOp });
  useAffectedAreas(coverageMap, affectedVisible, filterOp);

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

  const centerOnLocation = useCallback((location: ActiveLocation) => {
    if (!coverageMap) return;
    coverageMap.flyTo({
      center: [location.longitude, location.latitude],
      zoom: Math.max(coverageMap.getZoom(), 13),
      speed: 1.25,
      curve: 1.35,
      essential: true,
    });
  }, [coverageMap]);

  const handleLocate = useCallback(() => {
    if (activeLocation) {
      if (coverageMap) centerOnLocation(activeLocation);
      else centerAfterLocate.current = true;
      return;
    }
    centerAfterLocate.current = true;
    geoState.requestLocation();
  }, [activeLocation, centerOnLocation, coverageMap, geoState]);

  useEffect(() => {
    if (!centerAfterLocate.current || !activeLocation || !coverageMap) return;
    centerOnLocation(activeLocation);
    centerAfterLocate.current = false;
  }, [activeLocation, centerOnLocation, coverageMap]);

  const totalVisible = useMemo(() => {
    return allFeatures.filter((f) => activeNetworks.has(f.properties.provider)).length;
  }, [allFeatures, activeNetworks]);

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-gray-50 lg:h-dvh">
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
          locationOverride={sessionLocation}
        />
      </div>

      {/* ── Top controls overlay ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 sm:p-4 safe-area-inset-top pointer-events-none flex flex-col gap-2">
        
        {/* Row 1: Search + Locate */}
        <div className="map-ui-enter relative z-30 flex gap-2 items-center pointer-events-auto w-full max-w-xl">
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
              onFlyToUser={handleLocate}
            />
          </div>
          {activeLocation && (
            <button
              type="button"
              onClick={startLocationAdjustment}
              aria-label="Adjust current location"
              title="Adjust current location"
              className="map-pressable flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-[0_1px_3px_rgba(60,64,67,0.2),0_4px_8px_rgba(60,64,67,0.12)] hover:bg-white hover:text-[#1a73e8]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M3 12h2m14 0h2M8 16l8-8M8 8h.01M16 16h.01" />
              </svg>
            </button>
          )}
        </div>

        {/* Row 2: Overflowing Filter Chips */}
        <div className="map-ui-enter-delay relative z-10 w-full pointer-events-auto overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            <NetworkFilterBar
              activeNetworks={activeNetworks}
              onToggleNetwork={toggleNetwork}
              siteCounts={siteCounts}
            />
            {allFeatures.length > 0 && (
              <div className="px-3 py-2 rounded-full bg-white/95 text-gray-500 text-xs font-medium shadow-sm whitespace-nowrap flex-shrink-0 border border-gray-200">
                {totalVisible.toLocaleString()} sites
              </div>
            )}
          </div>
        </div>
      </div>

      {isAdjustingLocation && reportPin && (
        <div className="fixed inset-0 z-30 pointer-events-none">
          <div className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-center text-xs font-medium text-white shadow-lg">Drag the red pin to set your location</div>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pointer-events-auto md:bottom-6 md:left-1/2 md:w-[400px] md:-translate-x-1/2 md:rounded-[28px]">
            <p className="text-sm font-bold text-gray-900">Confirm selected location</p>
            <p className="mt-1 text-xs text-gray-500">This point will be used for location-based features in this session.</p>
            <p className="mt-2 text-[11px] font-mono text-gray-500" aria-live="polite">Selected: {reportPin.latitude.toFixed(5)}, {reportPin.longitude.toFixed(5)}</p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => { setReportPin(null); setIsAdjustingLocation(false); }} className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={() => { saveSessionLocation(reportPin); setReportPin(null); setIsAdjustingLocation(false); }} className="flex-1 rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black">Use this location</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom controls container ────────────────────────────────────────── */}
      {/* 1. Layers & Legend controls (bottom right) */}
      <div className="map-ui-enter-delay absolute bottom-[112px] sm:bottom-7 right-3 sm:right-4 z-20 flex flex-col gap-2 items-end pointer-events-auto">
        <details className="rounded-xl border border-slate-200 bg-white/95 p-3 text-sm shadow-md backdrop-blur">
          <summary className="cursor-pointer font-semibold text-slate-700">Layers</summary>
          <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={heatmapVisible} onChange={(e) => setHeatmapVisible(e.target.checked)} /> Coverage</label>
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={affectedVisible} onChange={(e) => setAffectedVisible(e.target.checked)} /> Affected areas</label>
        </details>
        {/* Nearby toggle (only when location is available) */}
        {hasLocation && (
          <button
            id="nearby-toggle"
            onClick={() => setShowNearby((v) => !v)}
            aria-label={showNearby ? "Hide nearby sites" : "Show nearby sites"}
            aria-pressed={showNearby}
            className={[
              "flex h-11 items-center gap-2 rounded-full border px-3 text-sm transition-colors shadow-md",
              showNearby
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-white/95 backdrop-blur-md border-gray-200 text-gray-700 hover:bg-white",
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
      <div className="absolute bottom-4 sm:bottom-7 left-1/2 -translate-x-1/2 z-20 safe-area-inset-bottom">
        <ReportButton onClick={() => setReportOpen(true)} />
      </div>

      {/* ── Geolocation error message ─────────────────────────────────────────── */}
      {geoState.errorMessage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 bg-white border border-amber-300 rounded-2xl text-xs text-amber-700 shadow-lg max-w-xs text-center"
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
        onConfirmPinAdjustment={saveSessionLocation}
        sessionLocation={sessionLocation}
      />
    </div>
  );
}
