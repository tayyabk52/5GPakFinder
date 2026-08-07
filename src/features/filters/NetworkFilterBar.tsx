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
      role="group"
      aria-label="Filter by network operator"
      className="flex gap-2 flex-wrap"
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
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              "border transition-all duration-200 select-none",
              isActive
                ? "border-transparent text-white shadow-sm"
                : "border-gray-300 bg-white/90 backdrop-blur-md text-gray-600 hover:text-gray-900 hover:border-gray-400 shadow-sm",
            ].join(" ")}
            style={
              isActive
                ? { backgroundColor: config.color, borderColor: config.color }
                : undefined
            }
          >
            {/* Color dot */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isActive ? "rgba(0,0,0,0.3)" : config.color }}
              aria-hidden
            />
            {config.label}
            {count > 0 && (
              <span
                className={`text-xs ${isActive ? "opacity-80" : "text-gray-400"}`}
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
