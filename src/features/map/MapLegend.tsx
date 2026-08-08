"use client";

/**
 * MapLegend — collapsible legend showing operator markers, user location, and cluster behavior.
 */

import { useState } from "react";
import { NETWORKS, NETWORK_IDS } from "@/config/networks";

export default function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        id="legend-toggle"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide map legend" : "Show map legend"}
        className="map-pressable flex h-11 items-center gap-2 px-3.5 bg-white/95 border border-gray-200 rounded-full text-gray-900 text-sm font-medium hover:bg-white shadow-md"
      >
        <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className="text-[13px] font-bold tracking-tight">Networks</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Map legend"
          className="map-popover-enter absolute bottom-full right-0 mb-2 w-56 bg-white rounded-2xl border border-gray-200 p-4 shadow-[0_8px_24px_rgba(60,64,67,0.18)]"
        >
          <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2.5">
            Operators
          </h3>
          <ul className="space-y-2 mb-3">
            {NETWORK_IDS.map((networkId) => {
              const config = NETWORKS[networkId];
              return (
                <li key={networkId} className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                    aria-hidden
                  />
                  <span className="text-sm text-gray-700">{config.label} 5G</span>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-gray-100 pt-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-300/50 flex-shrink-0" aria-hidden />
              <span className="text-sm text-gray-700">Your location</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center flex-shrink-0" aria-hidden>
                <span className="text-[8px] text-white font-bold">N</span>
              </div>
              <span className="text-sm text-gray-700">Cluster (tap to expand)</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              Coordinates from official provider maps. Not independently surveyed tower positions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
