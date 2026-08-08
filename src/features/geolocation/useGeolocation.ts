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
  timeout: 20000,
  maximumAge: 60_000,
};

const FALLBACK_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15000,
  maximumAge: 300_000,
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

    const setPosition = (position: GeolocationPosition) => {
      const accuracy = position.coords.accuracy;
      setState({
        status: "granted",
        position,
        accuracy: Math.round(accuracy),
        errorMessage: null,
      });
    };

    const setError = (error: GeolocationPositionError) => {
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
    };

    const startWatching = () => {
      // After the permission prompt and initial reading, continue refining the position.
      watchIdRef.current = navigator.geolocation.watchPosition(
        setPosition,
        (error) => {
          // Do not discard a successfully acquired position if later watch updates fail.
          setError(error);
        },
        GEOLOCATION_OPTIONS
      );
    };

    // iOS Safari is more reliable when the user gesture starts with a one-shot request.
    // It also lets us retry with lower accuracy when GPS cannot obtain a precise fix indoors.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPosition(position);
        startWatching();
      },
      (error) => {
        if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
          setError(error);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setPosition(position);
            startWatching();
          },
          setError,
          FALLBACK_GEOLOCATION_OPTIONS
        );
      },
      GEOLOCATION_OPTIONS
    );
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
