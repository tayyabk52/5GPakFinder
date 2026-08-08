"use client";

import { useEffect, useMemo, useState } from "react";
import { useFingerprint } from "@/features/coverage-reports/fingerprint/useFingerprint";
import { useGeolocation } from "@/features/geolocation/useGeolocation";
import { useReportSubmission } from "@/features/coverage-reports/hooks/useReportSubmission";
import SpeedTestPanel from "@/features/coverage-reports/components/SpeedTestPanel";
import SuccessCard from "@/features/coverage-reports/components/SuccessCard";
import LocationSearchInput from "@/features/coverage-reports/components/LocationSearchInput";
import type { OperatorId, ReportSubmission, SpeedSample } from "@/features/coverage-reports/types";
import type { ReportPin } from "@/features/map/MapContainer";

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  adjustedPin: ReportPin | null;
  onStartPinAdjustment: (latitude: number, longitude: number) => void;
  onStopPinAdjustment: () => void;
}



const OPERATORS: Array<OperatorId> = ["Jazz", "Zong", "Ufone"];

export default function ReportSheet({
  open,
  onClose,
  onSubmitSuccess,
  adjustedPin,
  onStartPinAdjustment,
  onStopPinAdjustment,
}: ReportSheetProps) {
  const geo = useGeolocation();
  const { fingerprint, isReady } = useFingerprint();
  const submission = useReportSubmission();

  const [operator, setOperator] = useState<OperatorId | null>(null);
  const [speed, setSpeed] = useState<SpeedSample | null>(null);
  const [manualPin, setManualPin] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [useManualPin, setUseManualPin] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

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

  const locationReady = Boolean(geo.position) || Boolean(manualCoordinates);
  const canSubmit = operator !== null && locationReady && isReady && submission.status !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit || !fingerprint) {
      return;
    }

    const latitude = manualCoordinates?.latitude ?? geo.position?.coords.latitude ?? 0;
    const longitude = manualCoordinates?.longitude ?? geo.position?.coords.longitude ?? 0;
    const accuracyMeters = manualCoordinates ? null : Math.round(geo.position?.coords.accuracy ?? 0);

    const body: ReportSubmission = {
      latitude,
      longitude,
      accuracyMeters,
      isManualPin: Boolean(manualCoordinates),
      operator: operator as OperatorId,
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
    setSpeed(null);
    setManualPin({ lat: "", lng: "" });
    setUseManualPin(false);
    onStopPinAdjustment();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/10" onClick={handleClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report 5G coverage"
        className="absolute bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:w-[400px] rounded-t-[32px] md:rounded-[32px] bg-white shadow-[0_-10px_60px_rgba(0,0,0,0.15)] md:shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-y-auto"
      >
        {submission.status === "success" && submission.result ? (
          <div className="p-6">
            <SuccessCard result={submission.result} onReportAnother={() => submission.reset()} onClose={handleClose} />
          </div>
        ) : (
          <div className="p-7">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-gray-900 text-lg font-bold tracking-tight">Report 5G coverage</h2>
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

            <div className="mb-4">
              <div className="flex flex-col gap-0.5 mb-2">
                <span className="text-sm font-medium text-gray-800">Your location</span>
                <span className="text-[11px] text-gray-500 leading-tight">We store your location to place and verify this report. The public map shows only aggregated coverage data.</span>
              </div>

              {geo.position && !useManualPin ? (
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
                  <p className="text-xs text-emerald-900 font-semibold mb-0.5">Custom Pin Selected</p>
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

            <div className="mb-4">
              <span className="text-sm font-medium text-gray-800 block mb-1.5">Operator (Required)</span>
              <div className="flex gap-2 flex-wrap">
                {OPERATORS.map((network) => (
                  <button
                    key={network}
                    onClick={() => setOperator(network)}
                    className={[
                      "px-4 py-2 text-[13px] rounded-full font-bold transition-all shadow-[0_4px_14px_rgba(0,0,0,0.06)]",
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

            <div className="mb-5">
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
              className="w-full px-5 py-4 mt-2 text-[15px] font-bold rounded-full bg-gray-900 text-white hover:bg-black shadow-[0_12px_40px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
