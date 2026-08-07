"use client";

import { useState, useEffect } from "react";

export interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
    type: "Point";
  };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    street?: string;
  };
}

export interface PhotonResult {
  features: PhotonFeature[];
}

export function usePhotonSearch(query: string, delayMs = 400) {
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = setTimeout(() => {
      // bbox around Pakistan for faster/more relevant results
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        q
      )}&bbox=60.8,23.6,77.8,37.1&limit=5`;

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Photon API error");
          return res.json();
        })
        .then((data: PhotonResult) => {
          if (active) {
            // Provide fallback if name missing
            const valid = data.features.filter(f => f.geometry?.coordinates).map(f => {
              if (!f.properties.name) {
                f.properties.name = f.properties.street || f.properties.city || "Unknown Location";
              }
              return f;
            });
            // Eliminate duplicates (sometimes OSM has multiple nodes for the same named street)
            const unique = valid.filter((v, i, a) => a.findIndex(t => (t.properties.name === v.properties.name && t.properties.city === v.properties.city)) === i);
            setResults(unique);
            setIsSearching(false);
          }
        })
        .catch((err) => {
          console.error("Photon Geocoding error:", err);
          if (active) {
            setResults([]);
            setIsSearching(false);
          }
        });
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, delayMs]);

  return { results, isSearching };
}
