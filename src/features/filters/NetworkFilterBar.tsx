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
              "flex h-10 items-center gap-2 px-3.5 rounded-full text-[13px] whitespace-nowrap flex-shrink-0",
              "transition-colors duration-150 select-none border shadow-sm",
              isActive
                ? "text-white font-semibold border-transparent shadow-md"
                : "bg-white/95 text-gray-700 font-medium hover:bg-white hover:text-gray-900 border-gray-200",
            ].join(" ")}
            style={
              isActive
                ? { backgroundColor: config.color }
                : undefined
            }
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-white" : ""}`}
              style={isActive ? undefined : { backgroundColor: config.color }}
              aria-hidden
            />
            {config.label}
            {count > 0 && (
              <span
                className={`text-[11px] ${isActive ? "text-white/85 font-medium" : "text-gray-400 font-medium"}`}
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
