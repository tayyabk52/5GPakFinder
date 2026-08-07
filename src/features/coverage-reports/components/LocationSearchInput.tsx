"use client";

import { useState, useRef, useEffect } from "react";
import { usePhotonSearch, type PhotonFeature } from "@/features/search/usePhotonSearch";

interface LocationSearchInputProps {
  onSelect: (lat: string, lng: string, displayName: string) => void;
}

export default function LocationSearchInput({ onSelect }: LocationSearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { results, isSearching } = usePhotonSearch(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="search"
        placeholder="Type a location (e.g. DHA Phase 6, Lahore)"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      />
      
      {isOpen && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl z-50 max-h-48 overflow-y-auto">
          {isSearching && results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No locations found.</div>
          ) : (
            results.map((feature, idx) => {
              const { name, city, state } = feature.properties;
              const [lng, lat] = feature.geometry.coordinates;
              const displayName = `${name}${city ? `, ${city}` : ""}`;
              return (
                <button
                  key={`${idx}-${name}`}
                  type="button"
                  onClick={() => {
                    setQuery(displayName);
                    setIsOpen(false);
                    onSelect(lat.toString(), lng.toString(), displayName);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="block text-sm text-gray-900 font-medium">{name}</span>
                  <span className="block text-xs text-gray-500">
                    {city}{state ? `, ${state}` : ""}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
