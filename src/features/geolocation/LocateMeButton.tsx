"use client";

/**
 * LocateMeButton — triggers geolocation and flies to user's position.
 */

import type { GeolocationStatus } from "@/features/geolocation/useGeolocation";

interface LocateMeButtonProps {
  status: GeolocationStatus;
  onLocate: () => void;
  onFlyToUser: () => void;
}

export default function LocateMeButton({ status, onLocate, onFlyToUser }: LocateMeButtonProps) {
  const isLoading = status === "requesting";
  const isGranted = status === "granted";
  const isError = status === "denied" || status === "unavailable" || status === "error" || status === "timeout";

  const handleClick = () => {
    if (isGranted) {
      onFlyToUser();
    } else {
      onLocate();
    }
  };

  const labelMap: Record<GeolocationStatus, string> = {
    idle: "Find my location",
    requesting: "Locating…",
    granted: "Center on my location",
    denied: "Location access denied",
    unavailable: "Location unavailable",
    timeout: "Location timed out — tap to retry",
    error: "Location error — tap to retry",
  };

  return (
    <div className="relative group">
      <button
        id="locate-me-button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={labelMap[status]}
        title={labelMap[status]}
        className={[
          "w-10 h-10 flex items-center justify-center rounded-xl",
          "border transition-all duration-200 shadow-lg",
          isGranted
            ? "bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
            : isError
            ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
            : "bg-white/90 backdrop-blur-md border-gray-300/70 text-gray-700 hover:text-gray-900 hover:bg-white",
          isLoading && "cursor-not-allowed opacity-70",
        ].join(" ")}
      >
        {isLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={isGranted
                ? "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
                : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              }
            />
          </svg>
        )}
      </button>

      {/* Error tooltip */}
      {isError && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-red-600 whitespace-nowrap shadow-xl"
        >
          {labelMap[status]}
        </div>
      )}
    </div>
  );
}
