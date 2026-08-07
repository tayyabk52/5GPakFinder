"use client";

/**
 * Client-side search hook.
 * Searches over loaded GeoJSON features by display_name, site_uid, city_source,
 * and inferred city from Jazz prefix — using only fields actually in the dataset.
 */

import { useState, useMemo, useCallback } from "react";
import type { CellSiteFeature } from "@/types/cell-site";
import { deriveCityForSite } from "@/features/cell-sites/utils/siteUtils";

const MAX_RESULTS = 8;

export interface SearchResult {
  feature: CellSiteFeature;
  matchedOn: string;
}

export interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  clearSearch: () => void;
}

function normalize(str: string): string {
  return str.toLowerCase().trim();
}

export function useSearch(features: CellSiteFeature[]): UseSearchReturn {
  const [query, setQueryState] = useState("");

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryState("");
  }, []);

  const isSearching = query.trim().length > 0;

  const results = useMemo<SearchResult[]>(() => {
    const q = normalize(query);
    if (!q || q.length < 2) return [];

    const matches: SearchResult[] = [];

    for (const feature of features) {
      if (matches.length >= MAX_RESULTS) break;
      const p = feature.properties;

      // Search targets (only fields that actually exist in the dataset)
      const searchTargets: Array<[string, string]> = [
        [p.display_name, "Name"],
        [p.site_uid, "Site ID"],
        [p.city_source, "City"],
        [deriveCityForSite(p) ?? "", "City"],
        [p.provider, "Operator"],
        [p.site_name_source, "Site code"],
      ];

      for (const [value, label] of searchTargets) {
        if (value && normalize(value).includes(q)) {
          matches.push({ feature, matchedOn: label });
          break;
        }
      }
    }

    return matches;
  }, [features, query]);

  return { query, setQuery, results, isSearching, clearSearch };
}
