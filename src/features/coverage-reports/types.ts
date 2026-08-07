export type FiveGPresence = "yes" | "no" | "maybe";
export type SpeedSource = "in_app" | "manual";
export type OperatorId = "Jazz" | "Zong";

export interface SpeedSample {
  source: SpeedSource;
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  speedtestUrl: string | null;
}

export interface ReportSubmission {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  isManualPin: boolean;
  fiveGPresent: FiveGPresence;
  operator: OperatorId | null;
  speed: SpeedSample | null;
  deviceFingerprint: string;
}

export interface CoverageCell {
  geohashPrefix: string;
  centerLat: number;
  centerLng: number;
  total: number;
  confirmed: number;
  notAvailable: number;
  intermittent: number;
  avgDownload: number | null;
  avgUpload: number | null;
  avgPing: number | null;
  avgTrust: number;
  jazzCount: number;
  zongCount: number;
  unknownCount: number;
}

export interface SubmitOk {
  ok: true;
  trustScore: number;
  status: "visible" | "hidden";
}
