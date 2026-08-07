export type ConfidenceTier = "very-high" | "high" | "medium" | "low" | "hidden";

export const VISIBLE_TRUST_THRESHOLD = 0.2;
export const VERIFIED_ONLY_THRESHOLD = 0.75;

export function trustTier(score: number): ConfidenceTier {
  if (score >= 0.75) return "very-high";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  if (score >= 0.2) return "low";
  return "hidden";
}

export function statusForTrust(score: number): "visible" | "hidden" {
  return score >= VISIBLE_TRUST_THRESHOLD ? "visible" : "hidden";
}

export const CONFIDENCE_COLORS: Record<Exclude<ConfidenceTier, "hidden">, string> = {
  "very-high": "#10b981",
  high: "#f59e0b",
  medium: "#ef4444",
  low: "#9ca3af",
};

export const SPEED_COLORS = {
  ultra: "#7c3aed", // > 200
  veryFast: "#3b82f6", // 100–200
  good: "#10b981", // 50–100
  fair: "#f59e0b", // 20–50
  poor: "#ef4444", // < 20
  lowData: "#9ca3af", // < 3 samples
} as const;
