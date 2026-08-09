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
          "w-[48px] h-[48px] flex flex-shrink-0 items-center justify-center rounded-full mt-0.5",
          "transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.08)]",
          isGranted
            ? "bg-gray-900 text-white hover:bg-black"
            : isError
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-white text-gray-900 hover:bg-gray-50",
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
                : "M12 2v20M2 12h20M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"
              }
            />
          </svg>
        )}
      </button>

      {/* Error tooltip */}
      {isError && status !== "denied" && (
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
