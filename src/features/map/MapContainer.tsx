"use client";

/**
 * MapContainer — the primary interactive map component.
 *
 * Responsibilities:
 * - Initializes MapLibre GL JS with CartoDB Positron (light) raster tiles
 * - Loads the GeoJSON dataset from /data/sites.geojson
 * - Renders Jazz and Zong sites as native MapLibre clustered layers
 * - Handles marker click → site selection
 * - Handles cluster click → zoom in
 * - Exposes MapProvider context to children
 * - Handles URL-based site selection (?site=jazz-0042)
 * - Handles URL-based map position (?lat=...&lng=...&zoom=...)
 *
 * Why a raster style object?
 * The GL JSON style was failing under Next.js/Turbopack because the map worker
 * could not be resolved (maplibre derives its default worker URL from
 * import.meta.url, which points at a bundle chunk — the sibling worker file is
 * never emitted). A same-origin worker URL is served from /workers/ and set via
 * setWorkerUrl() before the map is created; the raster style is used as a
 * lightweight, dependency-free basemap.
 *
 * Data-loading design:
 * The GeoJSON is fetched on mount, INDEPENDENTLY of the map lifecycle, so the
 * network filters/search/counts populate even if the map's one-shot "load"
 * event is missed. The source/layers are added by `tryAddLayers`, which runs
 * whenever either the data arrives OR the style becomes ready — whichever
 * happens last wins, and the body is idempotent + guarded so it only runs once.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Map as MapLibreMap, Marker, GeoJSONSource, MapMouseEvent, MapLibreEvent, FilterSpecification, ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import type { CellSiteFeature, CellSiteFeatureCollection } from "@/types/cell-site";
import { MapProviderContext } from "./MapProviderContext";
import { MapLibreProvider } from "./providers/MapLibreProvider";
import { NETWORKS, UNKNOWN_OPERATOR_COLOR } from "@/config/networks";
import { SITE_ICONS } from "./siteIcon";

// Worker served from /public — see note above. Same-origin → loaded directly as
// a module worker; the relative "./maplibre-gl-shared.mjs" import resolves fine.
const WORKER_URL = "/workers/maplibre-gl-worker.mjs";

// CartoDB Positron (light) raster style object — instant, dependency-free basemap.
const CARTO_LIGHT_RASTER_STYLE: StyleSpecification = {
  version: 8,
  name: "CartoDB Positron",
  sources: {
    "carto-light": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CartoDB · © OpenStreetMap · Jazz/Zong (provider data)",
    },
  },
  layers: [
    {
      id: "carto-light-tiles",
      type: "raster",
      source: "carto-light",
      minzoom: 0,
      maxzoom: 19,
    }
  ]
};

// Pakistan center
const DEFAULT_CENTER: [number, number] = [69.3451, 30.3753];
const DEFAULT_ZOOM = 5;

// Source/layer IDs
const SOURCE_ID = "cell-sites";
const LAYER_CLUSTER = "clusters";
const LAYER_CLUSTER_COUNT = "cluster-count";
const LAYER_UNCLUSTERED = "unclustered-points";

interface MapContainerProps {
  onSiteSelect: (feature: CellSiteFeature | null) => void;
  selectedSiteId: string | null;
  activeNetworks: Set<string>;
  userPosition: GeolocationPosition | null;
  onFeaturesLoaded: (features: CellSiteFeature[]) => void;
  onMapReady?: (map: MapLibreMap) => void;
}

export default function MapContainer({
  onSiteSelect,
  selectedSiteId,
  activeNetworks,
  userPosition,
  onFeaturesLoaded,
  onMapReady,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const providerRef = useRef<MapLibreProvider | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const allFeaturesRef = useRef<CellSiteFeature[]>([]);
  const dataRef = useRef<CellSiteFeatureCollection | null>(null);

  const [mapProvider, setMapProvider] = useState<MapLibreProvider | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Stable refs for callbacks
  const onSiteSelectRef = useRef(onSiteSelect);
  onSiteSelectRef.current = onSiteSelect;
  const onFeaturesLoadedRef = useRef(onFeaturesLoaded);
  onFeaturesLoadedRef.current = onFeaturesLoaded;
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  // ── Initialize MapLibre + load data (decoupled) ───────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let isMounted = true;
    let layersAdded = false;

    // Adds the GeoJSON source + layers. Requires BOTH the style to be ready and
    // the data to be present; runs once (whichever precondition is satisfied
    // last triggers it). Safe to call repeatedly — it early-returns until ready.
    const tryAddLayers = async () => {
      const map = mapRef.current;
      const data = dataRef.current;
      if (!isMounted || layersAdded || !map || !data) return;
      if (!map.isStyleLoaded()) return;
      layersAdded = true;

      // Stop listening for style readiness — layers are built only once.
      map.off("load", handleStyleReady);
      map.off("styledata", handleStyleReady);
      map.off("idle", handleStyleReady);

      // 1) Preload distinct SVG icons for operators
      const loadIcon = (id: string, url: string) => {
        return new Promise<void>((resolve) => {
          if (map.hasImage(id)) {
            resolve();
            return;
          }
          const img = new Image();
          img.onload = () => {
            if (!map.hasImage(id)) {
              map.addImage(id, img);
            }
            resolve();
          };
          img.onerror = (err) => {
            console.error(`Failed to load icon ${id}:`, err);
            resolve();
          };
          img.src = url;
        });
      };

      await Promise.all([
        loadIcon("icon-Zong", SITE_ICONS.Zong),
        loadIcon("icon-Jazz", SITE_ICONS.Jazz),
        loadIcon("icon-Ufone", SITE_ICONS.Ufone),
        loadIcon("icon-Unknown", SITE_ICONS.Unknown),
      ]);
      if (!isMounted) return;

      // Add source if not present
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: data as GeoJSON.FeatureCollection,
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 13,
        });
      }

      // Cluster circles layer (light theme: solid blue, white count text)
      if (!map.getLayer(LAYER_CLUSTER)) {
        map.addLayer({
          id: LAYER_CLUSTER,
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#3B82F6",
              10, "#2563EB",
              50, "#1D4ED8",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              18,
              10, 24,
              50, 32,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#FFFFFF",
          },
        });
      }

      // Cluster count text label
      if (!map.getLayer(LAYER_CLUSTER_COUNT)) {
        map.addLayer({
          id: LAYER_CLUSTER_COUNT,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 13,
          },
          paint: {
            "text-color": "#FFFFFF",
          },
        });
      }

      // Unclustered individual site points
      if (!map.getLayer(LAYER_UNCLUSTERED)) {
        map.addLayer({
          id: LAYER_UNCLUSTERED,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": [
              "match",
              ["get", "provider"],
              "Zong", "icon-Zong",
              "Jazz", "icon-Jazz",
              "Ufone / Onic", "icon-Ufone",
              "Ufone", "icon-Ufone",
              "icon-Unknown"
            ],
            "icon-size": 0.85,
            "icon-allow-overlap": false,
            "icon-anchor": "bottom",
          },
        });
      }

      onMapReadyRef.current?.(map);

      // Cluster click → zoom in
      map.on("click", LAYER_CLUSTER, (e: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTER] });
        if (!features.length) return;
        const cluster = features[0];
        const clusterSource = map.getSource(SOURCE_ID) as GeoJSONSource;
        const clusterId = cluster.properties?.cluster_id as number;
        clusterSource
          .getClusterExpansionZoom(clusterId)
          .then((zoom: number) => {
            map.easeTo({
              center: (cluster.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom ?? map.getZoom() + 2,
            });
          })
          .catch(() => {});
      });

      // Site point click → select
      map.on("click", LAYER_UNCLUSTERED, (e: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_UNCLUSTERED] });
        if (!features.length) return;
        const clickedProps = features[0].properties;
        const matchingFeature = allFeaturesRef.current.find(
          (f) => f.properties.site_uid === clickedProps?.site_uid
        );
        if (matchingFeature) {
          onSiteSelectRef.current(matchingFeature);
          const currentParams = searchParamsRef.current;
          const newParams = new URLSearchParams(currentParams.toString());
          newParams.set("site", matchingFeature.properties.site_uid);
          routerRef.current.replace(`${pathnameRef.current}?${newParams.toString()}`, { scroll: false });
        }
      });

      // Hover cursors
      map.on("mouseenter", LAYER_CLUSTER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER_CLUSTER, () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", LAYER_UNCLUSTERED, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER_UNCLUSTERED, () => { map.getCanvas().style.cursor = ""; });

      // Fly to site specified in initial URL
      const params = searchParamsRef.current;
      const urlSiteId = params.get("site");
      if (urlSiteId) {
        const urlFeature = data.features.find((f) => f.properties.site_uid === urlSiteId);
        if (urlFeature) {
          onSiteSelectRef.current(urlFeature);
          const [lon, lat] = urlFeature.geometry.coordinates;
          map.flyTo({ center: [lon, lat], zoom: 14, speed: 0 });
        }
      }

      setIsMapReady(true);
    };

    // Named handler so it can be added/removed across multiple style events.
    function handleStyleReady() {
      tryAddLayers();
    }

    // 1) Fetch the dataset immediately — independent of the map lifecycle.
    const loadData = async () => {
      try {
        const response = await fetch("/data/sites.geojson");
        if (!response.ok) throw new Error(`Failed to load sites: ${response.status}`);
        const data: CellSiteFeatureCollection = await response.json();
        if (!isMounted) return;

        dataRef.current = data;
        allFeaturesRef.current = data.features;
        onFeaturesLoadedRef.current(data.features);
        tryAddLayers();
      } catch (err: unknown) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : "Failed to load site data.");
        }
      }
    };

    // 2) Initialize the map.
    const initMap = async () => {
      const maplibregl = await import("maplibre-gl");

      if (!isMounted || !mapContainerRef.current) return;

      // Point maplibre at our same-origin worker bundle — required for the
      // GeoJSON source (clustering + parsing run in the worker).
      maplibregl.setWorkerUrl(WORKER_URL);

      // Read URL params for initial center/zoom
      const params = searchParamsRef.current;
      const urlLat = parseFloat(params.get("lat") ?? "");
      const urlLng = parseFloat(params.get("lng") ?? "");
      const urlZoom = parseFloat(params.get("zoom") ?? "");

      const center: [number, number] =
        !isNaN(urlLat) && !isNaN(urlLng) ? [urlLng, urlLat] : DEFAULT_CENTER;
      const zoom = !isNaN(urlZoom) ? urlZoom : DEFAULT_ZOOM;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: CARTO_LIGHT_RASTER_STYLE,
        center,
        zoom,
        minZoom: 3,
        maxZoom: 18,
        attributionControl: false,
      });

      mapRef.current = map;

      // Attribution
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: "© CartoDB · © OpenStreetMap · Jazz/Zong (provider data)",
        }),
        "bottom-left"
      );

      // Native zoom controls
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      // Expose provider to children as soon as the map exists.
      const provider = new MapLibreProvider(map);
      provider.isReady = true;
      providerRef.current = provider;
      setMapProvider(provider);

      // Try to build layers as soon as the style is ready — listen broadly so we
      // never depend on catching a single one-shot event.
      if (map.isStyleLoaded()) {
        tryAddLayers();
      }
      map.on("load", handleStyleReady);
      map.on("styledata", handleStyleReady);
      map.on("idle", handleStyleReady);

      map.on("error", (e: MapLibreEvent & { error?: Error }) => {
        console.error("MapLibre event error:", e.error?.message ?? e);
      });
    };

    loadData();
    initMap().catch((err: unknown) => {
      if (isMounted) {
        setLoadError(err instanceof Error ? err.message : "Failed to initialize map.");
      }
    });

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update network filter layers ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const activeArray = [...activeNetworks];
    const filter = [
      "all",
      ["!", ["has", "point_count"]],
      ["in", ["get", "provider"], ["literal", activeArray]],
    ];

    if (map.getLayer(LAYER_UNCLUSTERED)) {
      map.setFilter(LAYER_UNCLUSTERED, filter as FilterSpecification);
    }
  }, [activeNetworks, isMapReady]);

  // ── Highlight selected site ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    if (map.getLayer(LAYER_UNCLUSTERED)) {
      map.setLayoutProperty(LAYER_UNCLUSTERED, "icon-size", [
        "case",
        ["==", ["get", "site_uid"], selectedSiteId ?? ""],
        1.15,
        0.85,
      ]);
    }
  }, [selectedSiteId, isMapReady]);

  // ── Watch URL for fly-to requests ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    const zoom = parseFloat(searchParams.get("zoom") ?? "");

    if (!isNaN(lat) && !isNaN(lng)) {
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const latDiff = Math.abs(currentCenter.lat - lat);
      const lngDiff = Math.abs(currentCenter.lng - lng);
      if (latDiff > 0.001 || lngDiff > 0.001) {
        map.flyTo({
          center: [lng, lat],
          zoom: !isNaN(zoom) ? zoom : currentZoom,
          speed: 1.4,
        });
      }
    }
  }, [searchParams, isMapReady]);

  // ── User location marker ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const updateMarker = async () => {
      const maplibregl = await import("maplibre-gl");

      if (userPosition) {
        const { latitude, longitude } = userPosition.coords;

        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        } else {
          const el = document.createElement("div");
          el.className = "user-location-marker";
          el.setAttribute("aria-label", "Your current location");
          el.setAttribute("role", "img");
          el.setAttribute("aria-hidden", "true");

          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }
      } else {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
      }
    };

    updateMarker();
  }, [userPosition, isMapReady]);

  return (
    <MapProviderContext.Provider value={{ mapProvider }}>
      <div className="relative w-full h-full">
        <div
          ref={mapContainerRef}
          id="map-container"
          className="w-full h-full bg-gray-100"
          aria-label="Interactive 5G cell site map of Pakistan"
          role="application"
        />

        {loadError && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/90 z-50"
            role="alert"
          >
            <div className="bg-white border border-red-300 rounded-xl p-6 max-w-sm mx-4 text-center shadow-xl">
              <div className="text-red-500 text-4xl mb-3" aria-hidden="true">⚠️</div>
              <h2 className="text-gray-900 font-semibold mb-2">Map data unavailable</h2>
              <p className="text-gray-500 text-sm">{loadError}</p>
              <button
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </div>
        )}
      </div>
    </MapProviderContext.Provider>
  );
}
