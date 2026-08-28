import { Suspense } from "react";
import InsightsDashboard from "@/features/insights/InsightsDashboard";

export default function InsightsPage() {
  return <Suspense fallback={<div className="grid h-full place-items-center bg-[#f4f5f6]"><p className="text-sm text-slate-600">Loading insights...</p></div>}><InsightsDashboard /></Suspense>;
}
