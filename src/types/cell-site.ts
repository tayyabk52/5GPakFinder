/**
 * Core domain types for telecom cell sites.
 * These types are derived directly from inspecting the actual dataset files.
 * No fields are fabricated — only fields present in pakistan_5g_sites_master.geojson are listed.
 */

import type { Feature, FeatureCollection, Point } from "geojson";

/**
 * Properties available on each GeoJSON feature from the master dataset.
 * Source: maps_data/pakistan_5g_sites_master.geojson + maps_data/data_dictionary.csv
 */
export interface CellSiteProperties {
  /** Stable unique ID for this bundle, e.g. "jazz-0001" or "zong-0042" */
  site_uid: string;
  /** Network provider name — exactly as in dataset: "Jazz" or "Zong" */
  provider: string;
  /** Original record index from the provider dataset */
  source_index: number;
  /** Name exactly as published by the provider. Blank = not provided by provider. */
  site_name_source: string;
  /** Agent-friendly label. For unnamed Zong records, a deterministic label like "Zong unnamed site 097". */
  display_name: string;
  /** City exactly as supplied by the provider.
   * Jazz KML does not supply a city field — it is blank for all Jazz records.
   * Zong records generally have a city. */
  city_source: string;
  /** WGS84 latitude (also available from geometry.coordinates[1]) */
  latitude: number;
  /** WGS84 longitude (also available from geometry.coordinates[0]) */
  longitude: number;
  /** Altitude in metres when provided. Nominally 0.0 for Jazz; may be blank/null for Zong. */
  altitude_m: number | null;
  /** Geometry type — always "Point" for site records */
  geometry_type: string;
  /** Always "provider_published_5g_site" */
  record_kind: string;
  /** True when the provider supplied a non-empty name */
  is_named: boolean;
  /** Set when two or more records share exact coordinates. E.g. "DUP-003". Empty string when not a duplicate. */
  duplicate_coordinate_group: string;
  /** Human-readable description of the official source dataset */
  source_dataset: string;
  /** Official provider source URL */
  source_url: string;
  /** Date the source was collected, ISO format, e.g. "2026-08-07" */
  retrieved_at: string;
  /** Required interpretation note about coordinate accuracy */
  accuracy_note: string;
}

/** A GeoJSON Feature representing a single 5G cell site */
export type CellSiteFeature = Feature<Point, CellSiteProperties>;

/** The full GeoJSON FeatureCollection of all sites */
export type CellSiteFeatureCollection = FeatureCollection<Point, CellSiteProperties>;

/**
 * Normalized internal representation consumed by UI components.
 * Components should use this — not the raw GeoJSON properties directly.
 */
export interface CellSite {
  id: string;
  provider: string;
  displayName: string;
  /** Inferred city — from city_source if Zong, or decoded from Jazz name prefix (FSD→Faisalabad etc.) */
  city: string | null;
  latitude: number;
  longitude: number;
  sourceUrl: string;
  retrievedAt: string;
  accuracyNote: string;
  /** Whether the provider supplied a real name (vs. auto-generated) */
  isNamed: boolean;
  duplicateGroup: string | null;
  sourceDataset: string;
  /** Raw provider name (e.g. "FSD7646" for Jazz, "Marriot" for Zong) */
  rawName: string;
}
