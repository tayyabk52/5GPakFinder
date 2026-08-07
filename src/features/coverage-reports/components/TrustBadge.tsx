"use client";

import { trustTier } from "@/features/coverage-reports/trust/trustTiers";

const TIER_LABEL: Record<string, string> = {
  "very-high": "Very high",
  high: "High",
  medium: "Medium",
  low: "Low",
  hidden: "Unverified",
};

export default function TrustBadge({ score }: { score: number }) {
  const tier = trustTier(score);
  const percent = Math.round(score * 100);
  const stars = Math.max(1, Math.min(4, Math.ceil(score * 4)));

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
      <span aria-hidden className="text-amber-500">{"★".repeat(stars)}{"☆".repeat(4 - stars)}</span>
      <span className="font-medium">{percent}%</span>
      <span className="text-gray-400">· {TIER_LABEL[tier]}</span>
    </span>
  );
}
