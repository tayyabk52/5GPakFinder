"use client";

/**
 * Network filter state hook.
 * Reads/writes active operators from the URL search params for shareability.
 */

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NETWORK_IDS } from "@/config/networks";

export interface UseNetworkFiltersReturn {
  activeNetworks: Set<string>;
  isNetworkActive: (networkId: string) => boolean;
  toggleNetwork: (networkId: string) => void;
  setAllNetworks: (active: boolean) => void;
  allActive: boolean;
}

const PARAM_KEY = "networks";

export function useNetworkFilters(): UseNetworkFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeNetworks = useMemo<Set<string>>(() => {
    const param = searchParams.get(PARAM_KEY);
    if (!param) {
      // Default: all networks active
      return new Set(NETWORK_IDS);
    }
    const requested = param.split(",").filter((n) => NETWORK_IDS.includes(n));
    // If nothing valid remains, show all
    if (requested.length === 0) return new Set(NETWORK_IDS);
    return new Set(requested);
  }, [searchParams]);

  const allActive = activeNetworks.size === NETWORK_IDS.length;

  const updateParams = useCallback(
    (nextNetworks: Set<string>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextNetworks.size === NETWORK_IDS.length) {
        // All active = clean URL (no param needed)
        params.delete(PARAM_KEY);
      } else {
        params.set(PARAM_KEY, [...nextNetworks].join(","));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const isNetworkActive = useCallback(
    (networkId: string) => activeNetworks.has(networkId),
    [activeNetworks]
  );

  const toggleNetwork = useCallback(
    (networkId: string) => {
      const next = new Set(activeNetworks);
      if (next.has(networkId)) {
        // Don't allow deactivating all operators
        if (next.size <= 1) return;
        next.delete(networkId);
      } else {
        next.add(networkId);
      }
      updateParams(next);
    },
    [activeNetworks, updateParams]
  );

  const setAllNetworks = useCallback(
    (active: boolean) => {
      if (active) {
        updateParams(new Set(NETWORK_IDS));
      } else {
        // Keep only first network when deactivating all (at minimum one always visible)
        updateParams(new Set([NETWORK_IDS[0]]));
      }
    },
    [updateParams]
  );

  return { activeNetworks, isNetworkActive, toggleNetwork, setAllNetworks, allActive };
}
