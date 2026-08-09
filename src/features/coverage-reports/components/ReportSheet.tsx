"use client";

import { useEffect, useMemo, useState } from "react";
import { useFingerprint } from "@/features/coverage-reports/fingerprint/useFingerprint";
import { useGeolocation } from "@/features/geolocation/useGeolocation";
import { useReportSubmission } from "@/features/coverage-reports/hooks/useReportSubmission";
import SpeedTestPanel from "@/features/coverage-reports/components/SpeedTestPanel";
import SuccessCard from "@/features/coverage-reports/components/SuccessCard";
import LocationSearchInput from "@/features/coverage-reports/components/LocationSearchInput";
import type { NetworkGeneration, OperatorId, ReportSubmission, SpeedSample } from "@/features/coverage-reports/types";
import type { ReportPin } from "@/features/map/MapContainer";

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  adjustedPin: ReportPin | null;
  onStartPinAdjustment: (latitude: number, longitude: number) => void;
  onStopPinAdjustment: () => void;
  onConfirmPinAdjustment: (pin: ReportPin) => void;
  sessionLocation: { latitude: number; longitude: number } | null;
}



const OPERATORS: Array<OperatorId> = ["Jazz", "Zong", "Ufone"];

export default function ReportSheet({
  open,
  onClose,
  onSubmitSuccess,
  adjustedPin,
  onStartPinAdjustment,
  onStopPinAdjustment,
  onConfirmPinAdjustment,
  sessionLocation,
}: ReportSheetProps) {
  const geo = useGeolocation();
  const { fingerprint, isReady } = useFingerprint();
  const submission = useReportSubmission();

  const [operator, setOperator] = useState<OperatorId | null>(null);
  const [networkGeneration, setNetworkGeneration] = useState<NetworkGeneration>("5g");
  const [speed, setSpeed] = useState<SpeedSample | null>(null);
  const [manualPin, setManualPin] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [useManualPin, setUseManualPin] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [pinAdjustmentConfirmed, setPinAdjustmentConfirmed] = useState(false);

  useEffect(() => {
    if (open && geo.status === "idle") {
      geo.requestLocation();
    }
  }, [open, geo]);

  useEffect(() => {
    if (geo.position && !useManualPin) {
      const lat = geo.position.coords.latitude;
      const lng = geo.position.coords.longitude;
      let active = true;
      fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (active && data.features && data.features.length > 0) {
            const p = data.features[0].properties;
            const parts = [p.name || p.street, p.city || p.district, p.state].filter(Boolean);
            setResolvedAddress(parts.join(", ") || null);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [geo.position, useManualPin]);

  useEffect(() => {
    if (adjustedPin) {
      setUseManualPin(true);
      setManualPin({ lat: String(adjustedPin.latitude), lng: String(adjustedPin.longitude) });
      setPinAdjustmentConfirmed(false);
    }
  }, [adjustedPin]);

  const manualCoordinates = useMemo(() => {
    const latitude = parseFloat(manualPin.lat);
    const longitude = parseFloat(manualPin.lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    return { latitude, longitude };
  }, [manualPin]);

  if (!open) {
    return null;
  }

  const locationReady = Boolean(sessionLocation) || Boolean(geo.position) || Boolean(manualCoordinates);
  const canSubmit = operator !== null && locationReady && isReady && submission.status !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit || !fingerprint) {
      return;
    }

    const latitude = manualCoordinates?.latitude ?? sessionLocation?.latitude ?? geo.position?.coords.latitude ?? 0;
    const longitude = manualCoordinates?.longitude ?? sessionLocation?.longitude ?? geo.position?.coords.longitude ?? 0;
    const accuracyMeters = manualCoordinates || sessionLocation ? null : Math.round(geo.position?.coords.accuracy ?? 0);

    const body: ReportSubmission = {
      latitude,
      longitude,
      accuracyMeters,
      isManualPin: Boolean(manualCoordinates || sessionLocation),
      operator: operator as OperatorId,
      networkGeneration,
      speed,
      deviceFingerprint: fingerprint,
    };

    const result = await submission.submit(body);
    if (result.ok) {
      onSubmitSuccess();
    }
  };

  const handleClose = () => {
    submission.reset();
    setOperator(null);
    setNetworkGeneration("5g");
    setSpeed(null);
    setManualPin({ lat: "", lng: "" });
    setUseManualPin(false);
    setPinAdjustmentConfirmed(false);
    onStopPinAdjustment();
    onClose();
  };

  const cancelPinAdjustment = () => {
    if (geo.position) {
      const { latitude, longitude } = geo.position.coords;
      setManualPin({ lat: String(latitude), lng: String(longitude) });
      setUseManualPin(false);
    }
    setPinAdjustmentConfirmed(false);
    onStopPinAdjustment();
  };

  // Pin adjustment uses the full map. Keeping only this compact confirmation
  // sheet visible is the familiar ride-hailing location-picker pattern.
  if (adjustedPin) {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none">
        <div className="map-ui-enter absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-center text-xs font-medium text-white shadow-lg">
          Drag the red pin to your exact location
        </div>
        <div className="map-sheet-enter absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pointer-events-auto md:bottom-6 md:left-1/2 md:w-[400px] md:-translate-x-1/2 md:rounded-[28px]">
          <p className="text-sm font-bold text-gray-900">Confirm report location</p>
          <p className="mt-1 text-xs text-gray-500">The blue location marker and report coordinates update as you move the red pin.</p>
          <p className="mt-2 text-[11px] font-mono text-gray-500" aria-live="polite">
            Selected: {adjustedPin.latitude.toFixed(5)}, {adjustedPin.longitude.toFixed(5)}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={cancelPinAdjustment}
              className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setPinAdjustmentConfirmed(true);
                onConfirmPinAdjustment(adjustedPin);
                onStopPinAdjustment();
              }}
              className="flex-1 rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
            >
              Use this location
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-[4.25rem] z-40 lg:inset-0">
      <div className="map-backdrop-enter absolute inset-0 bg-black/10" onClick={handleClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report coverage and speed"
        className="map-sheet-enter absolute bottom-0 left-0 right-0 max-h-full overflow-y-auto rounded-t-[24px] bg-white shadow-[0_-10px_60px_rgba(0,0,0,0.15)] md:bottom-6 md:left-auto md:right-6 md:w-[400px] md:rounded-[28px] md:shadow-[0_20px_60px_rgba(0,0,0,0.15)] lg:max-h-[90vh]"
      >
        {submission.status === "success" && submission.result ? (
          <div className="p-6">
            <SuccessCard result={submission.result} onReportAnother={() => submission.reset()} onClose={handleClose} />
          </div>
        ) : (
          <div className="p-4 sm:p-6 md:p-7">
            <div className="mb-4 flex items-start justify-between sm:mb-6">
              <div>
                <h2 className="text-base font-bold tracking-tight text-gray-900 sm:text-lg">Report coverage & speed</h2>
                <p className="text-xs text-gray-500 mt-0.5">No account needed — we check reports so fake ones do not fill the map.</p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close report form"
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3 sm:mb-4">
              <div className="flex flex-col gap-0.5 mb-2">
                <span className="text-sm font-medium text-gray-800">Your location</span>
                <span className="text-[11px] text-gray-500 leading-tight">We store your location to place and verify this report. The public map shows only aggregated coverage data.</span>
              </div>

              {sessionLocation && !useManualPin ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <p className="text-xs text-emerald-900 font-semibold mb-0.5">Adjusted session location</p>
                  <p className="text-[11px] text-emerald-700">This corrected location is used for nearby sites and this report.</p>
                  <p className="mt-1 text-[11px] text-emerald-700 font-mono">Lat: {sessionLocation.latitude.toFixed(5)}, Lng: {sessionLocation.longitude.toFixed(5)}</p>
                </div>
              ) : geo.position && !useManualPin ? (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live GPS Position
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        (geo.accuracy ?? geo.position.coords.accuracy) <= 15
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      ±{geo.accuracy ?? Math.round(geo.position.coords.accuracy)}m accuracy
                    </span>
                  </div>
                  {resolvedAddress && (
                    <p className="text-xs text-gray-700 font-medium truncate">
                      📍 {resolvedAddress}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 font-mono">
                    Lat: {geo.position.coords.latitude.toFixed(5)}, Lng: {geo.position.coords.longitude.toFixed(5)}
                  </p>
                </div>
              ) : manualCoordinates ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <p className="text-xs text-emerald-900 font-semibold mb-0.5">
                    {pinAdjustmentConfirmed ? "Adjusted location saved" : "Custom Pin Selected"}
                  </p>
                  {pinAdjustmentConfirmed && (
                    <p className="text-[11px] text-emerald-700 mb-1">This location will be used when you submit the report.</p>
                  )}
                  <p className="text-[11px] text-emerald-700 font-mono">
                    Lat: {manualCoordinates.latitude.toFixed(5)}, Lng: {manualCoordinates.longitude.toFixed(5)}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => geo.requestLocation()}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                >
                  {geo.status === "requesting" ? "Locating…" : "Allow location access"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onStopPinAdjustment();
                  setUseManualPin((value) => !value);
                }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                {useManualPin ? "Use GPS location instead" : "Enter location manually"}
              </button>

              {geo.position && !useManualPin && (
                <button
                  type="button"
                  onClick={() => {
                    const { latitude, longitude } = geo.position!.coords;
                    setManualPin({ lat: String(latitude), lng: String(longitude) });
                    setUseManualPin(true);
                    onStartPinAdjustment(latitude, longitude);
                  }}
                  className="mt-2 ml-3 text-xs text-blue-600 hover:text-blue-700"
                >
                  Adjust pin on map
                </button>
              )}

              {useManualPin && (
                <div className="mt-2">
                  {geo.position && (
                    <div className="mb-2 rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                      <p className="text-xs text-blue-900 font-semibold">Need to correct the GPS point?</p>
                      <p className="mt-0.5 text-[11px] text-blue-700">Drag the map pin to your exact location, up to 2 km from your detected position.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const { latitude, longitude } = geo.position!.coords;
                          setManualPin({ lat: String(latitude), lng: String(longitude) });
                          setUseManualPin(true);
                          onStartPinAdjustment(latitude, longitude);
                        }}
                        className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        {adjustedPin ? "Adjusting pin on map" : "Adjust pin on map"}
                      </button>
                      {adjustedPin && (
                        <button
                          type="button"
                          onClick={onStopPinAdjustment}
                          className="mt-2 ml-3 text-xs font-semibold text-gray-600 hover:text-gray-900"
                        >
                          Done adjusting
                        </button>
                      )}
                    </div>
                  )}
                  <LocationSearchInput 
                    onSelect={(lat, lng, name) => {
                      onStopPinAdjustment();
                      setPinAdjustmentConfirmed(false);
                      setManualPin({ lat, lng });
                    }}
                  />
                  {manualCoordinates && (
                     <p className="mt-1.5 text-xs text-green-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                       Points to {manualPin.lat}, {manualPin.lng}
                     </p>
                  )}
                </div>
              )}
            </div>

            <div className="mb-3 sm:mb-4">
              <span className="mb-1.5 block text-xs font-medium text-gray-800 sm:text-sm">Operator (Required)</span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {OPERATORS.map((network) => (
                  <button
                    key={network}
                    onClick={() => setOperator(network)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-[0_4px_14px_rgba(0,0,0,0.06)] sm:px-4 sm:py-2 sm:text-[13px]",
                      operator === network
                        ? "bg-gray-900 text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] scale-100"
                        : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 scale-95 hover:scale-100",
                    ].join(" ")}
                  >
                    {network}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 sm:mb-5">
              <span className="mb-1.5 block text-xs font-medium text-gray-800 sm:text-sm">Connection technology</span>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1 sm:gap-2 sm:p-1.5">
                {(["5g", "4g"] as const).map((generation) => <button key={generation} type="button" onClick={() => setNetworkGeneration(generation)} aria-pressed={networkGeneration === generation} className={`min-h-9 rounded-lg px-2 text-xs font-bold transition sm:min-h-11 sm:px-3 sm:text-sm ${networkGeneration === generation ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>{generation === "5g" ? "5G" : "4G LTE"}</button>)}
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-gray-500 sm:mt-2 sm:text-[11px]">Choose the network shown on your phone. LTE reports are stored separately and never change 5G speed or coverage results.</p>
            </div>

            <div className="mb-4 sm:mb-5">
              <SpeedTestPanel 
                value={speed} 
                onChange={(s) => {
                  setSpeed(s);
                  if (s && s.isp) {
                    const lisp = s.isp.toLowerCase();
                    const carrier = s.carrier?.toLowerCase() || "";
                    if (lisp.includes("zong") || carrier.includes("zong")) setOperator("Zong");
                    if (lisp.includes("jazz") || carrier.includes("jazz")) setOperator("Jazz");
                    if (lisp.includes("ufone") || carrier.includes("ufone") || lisp.includes("onic") || carrier.includes("onic") || lisp.includes("ptml")) setOperator("Ufone");
                  }
                }} 
              />
            </div>

            {submission.status === "error" && (
              <p role="alert" className="text-xs text-red-600 mb-3">
                {submission.error}
              </p>
            )}

            <button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="mt-1 w-full rounded-full bg-gray-900 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:mt-2 sm:px-5 sm:py-3.5 sm:text-[15px] sm:shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
            >
              {submission.status === "submitting" ? "Submitting…" : "Submit report"}
            </button>

            {!isReady && (
              <p className="mt-2 text-[11px] text-gray-400">Preparing report fingerprint…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
