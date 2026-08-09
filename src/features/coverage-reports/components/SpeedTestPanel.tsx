"use client";

import { useState } from "react";
import InfoTooltip from "@/features/coverage-reports/components/InfoTooltip";
import type { SpeedSample, SpeedSource } from "@/features/coverage-reports/types";

interface SpeedTestPanelProps {
  value: SpeedSample | null;
  onChange: (sample: SpeedSample | null) => void;
}

type Mode = "none" | "fetch" | "manual";
type SpeedtestResolveResponse =
  | { ok: true; data: ResolvedSpeedtestData }
  | { ok: false; reason?: string };

interface ResolvedSpeedtestData {
  source: SpeedSource;
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  resultUrl: string;
  deviceModel?: string | null;
  carrier?: string | null;
  isp?: string | null;
  serverName?: string | null;
  isWifi?: boolean;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An error occurred";
}

export default function SpeedTestPanel({ value, onChange }: SpeedTestPanelProps) {
  const [mode, setMode] = useState<Mode>(
    value ? (value.source === "manual" && !value.speedtestUrl ? "manual" : "fetch") : "none"
  );
  
  const [urlInput, setUrlInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [routerModel, setRouterModel] = useState("");

  const setManual = (patch: Partial<SpeedSample>) => {
    const base: SpeedSample =
      value && value.source === "manual"
        ? value
        : {
            source: "manual",
            downloadMbps: null,
            uploadMbps: null,
            pingMs: null,
            speedtestUrl: null,
          };

    onChange({ ...base, ...patch, source: "manual" });
  };

  const handleFetch = async () => {
    if (!urlInput.trim()) return;
    setFetching(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/speedtest/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const json = (await res.json()) as SpeedtestResolveResponse;
      if (!res.ok || !json.ok) {
        throw new Error(!json.ok ? json.reason || "Failed to fetch speedtest data" : "Failed to fetch speedtest data");
      }
      const data = json.data;
      onChange({
        source: data.source,
        downloadMbps: data.downloadMbps,
        uploadMbps: data.uploadMbps,
        pingMs: data.pingMs,
        speedtestUrl: data.resultUrl,
        deviceModel: data.deviceModel,
        carrier: data.carrier,
        isp: data.isp,
        serverName: data.serverName,
        isWifi: data.isWifi,
        wifiDeviceModel: null,
      });
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-2.5 sm:p-3">
      <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2">
        <span className="text-xs font-medium text-gray-800 sm:text-sm">Speed data (optional)</span>
        <InfoTooltip
          label="Speed test"
          text="Paste your Speedtest.net public result link to instantly populate the speed and ping values."
        />
      </div>

      <div className="mb-1.5 flex gap-1.5 sm:mb-2 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("fetch");
          }}
          className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs leading-4 sm:px-3 sm:py-2 sm:text-sm ${mode === "fetch" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200"}`}
        >
          Paste Speedtest Link
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("manual");
            if (value && value.source !== "manual") {
              onChange(null); // Reset if they are switching mode and previous was fetched
            }
          }}
          className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs leading-4 sm:px-3 sm:py-2 sm:text-sm ${mode === "manual" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200"}`}
        >
          Enter Manually
        </button>
      </div>

      {mode === "fetch" && (
        <div className="space-y-2 mt-2">
          {!value || (value.source === "manual" && !value.speedtestUrl) ? (
            <div className="flex gap-1.5 sm:gap-2">
              <input
                type="url"
                placeholder="e.g. https://www.speedtest.net/result/12345678"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs sm:text-sm"
              />
              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching || !urlInput.trim()}
                className="whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-60 sm:px-3 sm:text-sm"
              >
                {fetching ? "Fetching..." : "Fetch"}
              </button>
            </div>
          ) : (
            <div className="relative rounded border border-green-200 bg-green-50 p-2 text-xs text-green-900 sm:text-sm">
              <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 text-[11px] text-green-700 hover:text-green-900 sm:text-xs">Clear</button>
              <div className="mb-1 pr-10 text-xs font-medium text-green-800 sm:text-sm">Results Found</div>
              <div className="pr-1 text-[11px] leading-4 sm:text-xs">Download {value.downloadMbps} Mbps | Upload {value.uploadMbps} Mbps | {value.pingMs} ms</div>
              {value.speedtestUrl && <div className="mt-1 truncate text-[10px] opacity-75 sm:text-xs">{value.speedtestUrl}</div>}
              
              <div className="mt-1.5 rounded border border-green-200/50 bg-white/50 p-1.5 text-[10px] text-green-700 sm:mt-2 sm:p-2 sm:text-xs">
                <div className="flex justify-between py-0.5 border-b border-green-100"><span className="opacity-75">Carrier</span><span className="font-medium">{value.carrier || "N/A"}</span></div>
                <div className="flex justify-between py-0.5 border-b border-green-100"><span className="opacity-75">ISP</span><span className="font-medium">{value.isp || "N/A"}</span></div>
                <div className="flex justify-between py-0.5"><span className="opacity-75">Device</span><span className="font-medium">{value.deviceModel || "N/A"}</span></div>
              </div>
              {value.isWifi && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-900">
                  <div className="font-semibold mb-1 text-xs uppercase tracking-wide">Action Requested</div>
                  <p className="text-xs mb-2">
                    Your test indicates it was run on Wi-Fi or Ethernet. If you are using a 5G device, please enter its distinct model below for verification.
                  </p>
                  <input 
                    type="text" 
                    placeholder="e.g. OWA500N" 
                    value={routerModel}
                    onChange={(e) => {
                       const v = e.target.value.replace(/[^a-zA-Z0-9\-\s]/g, "").slice(0, 50);
                       setRouterModel(v);
                       onChange({ ...value, wifiDeviceModel: v || null });
                    }}
                    className="w-full px-2 py-1 border border-yellow-300 rounded text-sm bg-white"
                  />
                </div>
              )}
            </div>
          )}
          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Download Mbps"
              aria-label="Download Mbps"
              value={value?.downloadMbps !== null ? value?.downloadMbps : ""}
              className="min-w-0 rounded-lg border border-gray-200 px-1.5 py-1.5 text-[11px] sm:px-2 sm:text-sm"
              onChange={(event) => setManual({ downloadMbps: event.target.value ? Number(event.target.value) : null })}
            />
            <input
              type="number"
              inputMode="decimal"
              placeholder="Upload Mbps"
              aria-label="Upload Mbps"
              value={value?.uploadMbps !== null ? value?.uploadMbps : ""}
              className="min-w-0 rounded-lg border border-gray-200 px-1.5 py-1.5 text-[11px] sm:px-2 sm:text-sm"
              onChange={(event) => setManual({ uploadMbps: event.target.value ? Number(event.target.value) : null })}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="ms"
              aria-label="Ping ms"
              value={value?.pingMs !== null ? value?.pingMs : ""}
              className="min-w-0 rounded-lg border border-gray-200 px-1.5 py-1.5 text-[11px] sm:px-2 sm:text-sm"
              onChange={(event) => setManual({ pingMs: event.target.value ? Number(event.target.value) : null })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
