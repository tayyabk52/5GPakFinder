export type SpeedSource = "desktop" | "mobile" | "manual";
export type OperatorId = "Jazz" | "Zong" | "Ufone";
export type NetworkGeneration = "4g" | "5g";

export interface SpeedSample {
  source: SpeedSource;
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  speedtestUrl: string | null;
  deviceModel?: string | null;
  carrier?: string | null;
  isp?: string | null;
  serverName?: string | null;
  isWifi?: boolean;
  wifiDeviceModel?: string | null;
}

export interface ReportSubmission {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  isManualPin: boolean;
  operator: OperatorId;
  networkGeneration: NetworkGeneration;
  speed: SpeedSample | null;
  deviceFingerprint: string;
}

export interface CoverageCell {
  geohashPrefix: string;
  centerLat: number;
  centerLng: number;
  total: number;
  avgDownload: number | null;
  avgUpload: number | null;
  avgPing: number | null;
  avgTrust: number;
  jazzCount: number;
  jazzAvgDownload: number | null;
  zongCount: number;
  zongAvgDownload: number | null;
  ufoneCount: number;
  ufoneAvgDownload: number | null;
}

export interface SubmitOk {
  ok: true;
  trustScore: number;
  status: "visible" | "hidden";
}
