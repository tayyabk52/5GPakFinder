"use client";

/**
 * Geolocation hook.
 * Wraps the browser Geolocation API with clear state management.
 * User location is never sent to any server or stored persistently.
 */

import { useState, useCallback, useRef } from "react";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout"
  | "error";

export interface GeolocationState {
  status: GeolocationStatus;
  position: GeolocationPosition | null;
  errorMessage: string | null;
}

export interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => void;
  clearLocation: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000, // 1 minute cache
};

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    position: null,
    errorMessage: null,
  });

  const watchIdRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "unavailable", position: null, errorMessage: "Geolocation is not supported by your browser." });
      return;
    }

    setState((prev) => ({ ...prev, status: "requesting", errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({ status: "granted", position, errorMessage: null });
      },
      (error) => {
        switch (error.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            setState({ status: "denied", position: null, errorMessage: "Location access was denied. Enable it in your browser settings." });
            break;
          case GeolocationPositionError.TIMEOUT:
            setState({ status: "timeout", position: null, errorMessage: "Location request timed out. Please try again." });
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            setState({ status: "unavailable", position: null, errorMessage: "Your location could not be determined." });
            break;
          default:
            setState({ status: "error", position: null, errorMessage: "An unknown error occurred while getting your location." });
        }
      },
      GEOLOCATION_OPTIONS
    );
  }, []);

  const clearLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState({ status: "idle", position: null, errorMessage: null });
  }, []);

  return { ...state, requestLocation, clearLocation };
}
