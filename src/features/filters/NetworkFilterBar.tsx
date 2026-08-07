"use client";

/**
 * NetworkFilterBar — operator toggle buttons.
 * Reads from NETWORKS config — no hard-coded Jazz/Zong logic.
 * Adding a new operator only requires updating networks.ts config.
 */

import { NETWORKS, NETWORK_IDS } from "@/config/networks";

interface NetworkFilterBarProps {
  activeNetworks: Set<string>;
  onToggleNetwork: (networkId: string) => void;
  siteCounts: Record<string, number>;
}

export default function NetworkFilterBar({
  activeNetworks,
  onToggleNetwork,
  siteCounts,
}: NetworkFilterBarProps) {
  return (
    <div
      className="flex gap-2 flex-nowrap"
    >
      {NETWORK_IDS.map((networkId) => {
        const config = NETWORKS[networkId];
        const isActive = activeNetworks.has(networkId);
        const count = siteCounts[networkId] ?? 0;

        return (
          <button
            key={networkId}
            id={`filter-${networkId.toLowerCase()}`}
            aria-pressed={isActive}
            aria-label={`${isActive ? "Hide" : "Show"} ${config.label} sites (${count} sites)`}
            onClick={() => onToggleNetwork(networkId)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-full text-[13px] tracking-wide whitespace-nowrap flex-shrink-0",
              "transition-all duration-300 select-none shadow-sm",
              isActive
                ? "text-white font-bold scale-100 shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                : "bg-white text-gray-600 font-medium hover:bg-gray-50 scale-95 hover:scale-100 hover:text-gray-900 border border-gray-100",
            ].join(" ")}
            style={
              isActive
                ? { backgroundColor: config.color }
                : undefined
            }
          >
            {/* Dot only exists when inactive, or we can just hide the dot completely when active to mimic pure pills */}
            {!isActive && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: config.color }}
                aria-hidden
              />
            )}
            {config.label}
            {count > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-md ${isActive ? "bg-black/20 text-white font-bold" : "text-gray-400 font-medium"}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
