"use client";

import { useState } from "react";
import { CONFIDENCE_COLORS, SPEED_COLORS } from "@/features/coverage-reports/trust/trustTiers";

export type HeatmapMode = "coverage" | "speed";

interface HeatmapLegendProps {
  mode: HeatmapMode;
  verifiedOnly: boolean;
  onToggleMode: (mode: HeatmapMode) => void;
  onToggleVerified: () => void;
}

export default function HeatmapLegend({ mode, verifiedOnly, onToggleMode, onToggleVerified }: HeatmapLegendProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        id="heatmap-legend-toggle"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide community reports legend" : "Community Reports"}
        className="map-pressable flex h-11 items-center gap-2 px-3.5 bg-white/95 border border-gray-200 rounded-full text-gray-900 text-sm font-medium hover:bg-white shadow-md"
      >
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          {/* Signal / Activity Icon instead of Lightning */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[13px] font-bold tracking-tight">Reports</span>
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
        <div className="map-popover-enter absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl border border-gray-200 p-4 shadow-[0_8px_24px_rgba(60,64,67,0.18)]">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">Community reports</h3>
          </div>

          <div className="flex gap-1 mb-2.5">
            <button
              onClick={() => onToggleMode("coverage")}
              className={`flex-1 px-3 py-1.5 text-[13px] rounded-full font-medium transition-colors ${mode === "coverage" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Coverage
            </button>
            <button
              onClick={() => onToggleMode("speed")}
              className={`flex-1 px-3 py-1.5 text-[13px] rounded-full font-medium transition-colors ${mode === "speed" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Speed
            </button>
          </div>

          <ul className="space-y-1.5 mb-3">
            {mode === "coverage"
              ? Object.entries(CONFIDENCE_COLORS).map(([tier, color]) => (
                  <li key={tier} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} aria-hidden />
                    <span className="text-xs text-gray-700 capitalize">{tier.replace("-", " ")} confidence</span>
                  </li>
                ))
              : (
                <>
                  {Object.entries(SPEED_COLORS).map(([tier, color]) => (
                    <li key={tier} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} aria-hidden />
                      <span className="text-xs text-gray-700 capitalize">{tier.replace(/([A-Z])/g, " $1")}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-gray-200" aria-hidden />
                    <span className="text-xs text-gray-500">No speed data</span>
                  </li>
                </>
              )}
          </ul>

          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={verifiedOnly} onChange={onToggleVerified} className="rounded" />
            Verified only (⭐ 0.75+)
          </label>
        </div>
      )}
    </div>
  );
}
