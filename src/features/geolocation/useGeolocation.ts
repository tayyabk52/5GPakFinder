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
  accuracy: number | null; // in meters
  errorMessage: string | null;
}

export interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => void;
  clearLocation: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0, // Force live fresh GPS read, no stale cache
};

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    position: null,
    accuracy: null,
    errorMessage: null,
  });

  const watchIdRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "unavailable", position: null, accuracy: null, errorMessage: "Geolocation is not supported by your browser." });
      return;
    }

    setState((prev) => ({ ...prev, status: "requesting", errorMessage: null }));

    // Clear any existing watcher before starting a new request
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Start watching position so GPS hardware progressively refines coordinates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        setState({
          status: "granted",
          position,
          accuracy: Math.round(accuracy),
          errorMessage: null,
        });
      },
      (error) => {
        // If watch returns an error and we haven't received a granted position yet
        setState((prev) => {
          if (prev.status === "granted") return prev;
          let msg = "An unknown error occurred while getting your location.";
          let status: GeolocationStatus = "error";
          if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
            status = "denied";
            msg = "Location access was denied. Enable it in your browser settings.";
          } else if (error.code === GeolocationPositionError.TIMEOUT) {
            status = "timeout";
            msg = "Location request timed out. Please try again.";
          } else if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
            status = "unavailable";
            msg = "Your location could not be determined.";
          }
          return { status, position: null, accuracy: null, errorMessage: msg };
        });
      },
      GEOLOCATION_OPTIONS
    );

    watchIdRef.current = watchId;
  }, []);

  const clearLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState({ status: "idle", position: null, accuracy: null, errorMessage: null });
  }, []);

  return { ...state, requestLocation, clearLocation };
}
