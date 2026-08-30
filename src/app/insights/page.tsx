import { Suspense } from "react";
import InsightsDashboard from "@/features/insights/InsightsDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Pakistan Mobile Network Insights",
  description: "Compare aggregated 5GPak community reports with an independently reviewed sample of Pakistani mobile speed tests sourced from public Reddit posts.",
  path: "/insights",
});

export default function InsightsPage() {
  return <Suspense fallback={<div className="grid h-full place-items-center bg-[#f4f5f6]"><p className="text-sm text-slate-600">Loading insights...</p></div>}><InsightsDashboard /></Suspense>;
}
