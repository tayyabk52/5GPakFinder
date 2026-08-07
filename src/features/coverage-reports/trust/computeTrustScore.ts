import type { SpeedSample } from "@/features/coverage-reports/types";

export const TRUST_BASE = 50;
export const TRUST_FETCHED_SPEED = 30;
export const TRUST_MANUAL_WITH_LINK = 30;
export const TRUST_MANUAL_NO_LINK = 18;
export const TRUST_ACCURACY_UNDER_30M = 20;
export const TRUST_ACCURACY_UNDER_100M = 10;
export const TRUST_MANUAL_PIN_PENALTY = -5;
export const TRUST_IP_REGION_FAR_PENALTY = -20;

export interface TrustInput {
  speed: SpeedSample | null;
  accuracyMeters: number | null;
  isManualPin: boolean;
  ipRegionFar: boolean;
}

function speedPoints(speed: SpeedSample | null): number {
  if (!speed) return 0;
  if (speed.source === "desktop" || speed.source === "mobile") {
    if (speed.isWifi) {
      return speed.wifiDeviceModel ? 20 : 10;
    }
    return TRUST_FETCHED_SPEED;
  }
  return speed.speedtestUrl ? TRUST_MANUAL_WITH_LINK : TRUST_MANUAL_NO_LINK;
}

function accuracyPoints(input: TrustInput): number {
  if (input.isManualPin || input.accuracyMeters === null) {
    return input.isManualPin ? TRUST_MANUAL_PIN_PENALTY : 0;
  }
  if (input.accuracyMeters < 30) return TRUST_ACCURACY_UNDER_30M;
  if (input.accuracyMeters <= 100) return TRUST_ACCURACY_UNDER_100M;
  return 0;
}

export function computeTrustScore(input: TrustInput): number {
  let raw = TRUST_BASE;
  raw += speedPoints(input.speed);
  raw += accuracyPoints(input);
  if (input.ipRegionFar) raw += TRUST_IP_REGION_FAR_PENALTY;
  const clamped = Math.max(0, Math.min(100, raw));
  return clamped / 100;
}
