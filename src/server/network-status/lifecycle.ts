import type { IncidentStatus } from "@/features/network-status/types";

export function incidentStatus(input: { affectedDevices15: number; cells15: number; affectedDevices30: number; cells30: number; normalDevices: number; affectedGrowth: number; lastAffectedMinutesAgo: number }): IncidentStatus | null {
  if (input.lastAffectedMinutesAgo >= 90) return "resolved";
  if (input.affectedGrowth === 0 && input.normalDevices >= 3) return "recovering";
  if (input.affectedDevices30 >= 8 && input.cells30 >= 3) return "high_agreement";
  if (input.affectedDevices15 >= 3 && input.cells15 >= 2) return "possible";
  return null;
}

export function outageTrust({ accuracyMeters, isManualPin, ipRegionFar }: { accuracyMeters: number | null; isManualPin: boolean; ipRegionFar: boolean }) {
  let score = 1;
  if (isManualPin) score -= 0.25;
  if (accuracyMeters === null || accuracyMeters > 250) score -= 0.2;
  else if (accuracyMeters > 75) score -= 0.1;
  if (ipRegionFar) score -= 0.2;
  return Math.max(0.2, Number(score.toFixed(2)));
}
