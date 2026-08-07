"use client";

/**
 * SearchBar — client-side search over loaded site features.
 * Searches display_name, site_uid, city_source, inferred Jazz city, and provider.
 */

import { useRef, useEffect } from "react";
import type { SearchResult } from "@/features/search/useSearch";
import { getNetworkConfig } from "@/config/networks";
import { deriveCityForSite } from "@/features/cell-sites/utils/siteUtils";
import type { CellSiteFeature } from "@/types/cell-site";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  onSelectResult: (result: SearchResult) => void;
  onClear: () => void;
}

export default function SearchBar({
  query,
  onQueryChange,
  results,
  isSearching,
  onSelectResult,
  onClear,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClear();
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClear]);

  return (
    <div className="relative w-full" role="search" aria-label="Search 5G sites">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          id="site-search-input"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search sites, cities, operators…"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isSearching && results.length > 0}
          className="w-full pl-11 pr-11 py-3.5 bg-white rounded-full text-gray-900 text-[15px] placeholder-gray-400 font-medium shadow-[0_12px_40px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-black transition-all"
        />
        {query && (
          <button
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isSearching && (
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 max-h-64 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              No sites found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((result, idx) => {
              if (result.type === "cell-site") {
                const { feature, matchedOn } = result;
                const networkConfig = getNetworkConfig(feature.properties.provider);
                const city = deriveCityForSite(feature.properties);
                return (
                  <button
                    key={feature.properties.site_uid}
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onSelectResult(result);
                      onClear();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: networkConfig?.color ?? "#94A3B8" }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate font-medium">
                        {feature.properties.display_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {networkConfig?.label ?? feature.properties.provider}
                        {city ? ` · ${city}` : ""}
                        <span className="ml-2 text-gray-400">via {matchedOn}</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              } else {
                const { feature } = result;
                const { name, city, state } = feature.properties;
                const locationKey = `geo-${idx}-${name}`;
                return (
                  <button
                    key={locationKey}
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onSelectResult(result);
                      onClear();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate font-medium">
                        {name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {city ? city : ""}{city && state ? ", " : ""}{state ? state : ""}
                        <span className="ml-2 text-blue-400 italic">Location Search</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              }
            })
          )}
        </div>
      )}
    </div>
  );
}
