"use client";

import type { SubmitOk } from "@/features/coverage-reports/types";
import TrustBadge from "@/features/coverage-reports/components/TrustBadge";

interface SuccessCardProps {
  result: SubmitOk;
  onReportAnother: () => void;
  onClose: () => void;
}

export default function SuccessCard({ result, onReportAnother, onClose }: SuccessCardProps) {
  return (
    <div className="text-center p-2">
      <div className="text-3xl mb-2" aria-hidden>
        ✓
      </div>
      <h3 className="text-gray-900 font-semibold mb-1">Report submitted</h3>
      <div className="flex justify-center mb-3">
        <TrustBadge score={result.trustScore} />
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {result.trustScore < 0.8
          ? "Add a speed test next time to raise your score."
          : "Thanks — your report helps make the map more accurate."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onReportAnother}
          className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
        >
          Add another
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
