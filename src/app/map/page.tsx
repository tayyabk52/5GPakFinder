import { Suspense } from "react";
import MainMapView from "@/components/MainMapView";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Pakistan 5G Coverage Map",
  description: "Explore provider-published Jazz, Zong, and Ufone / Onic 5G site locations across Pakistan alongside community network reports and reviewed Reddit speed samples.",
  path: "/map",
});

export default function MapPage() {
  return <div className="flex h-full min-h-0 flex-col">
    <header className="flex min-h-11 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-5">
      <h1 className="text-sm font-bold text-slate-950">Pakistan 5G coverage map</h1>
      <p className="hidden text-xs font-medium text-slate-500 sm:block">932 provider-published site records</p>
    </header>
    <div className="min-h-0 flex-1"><Suspense fallback={<div className="grid h-full place-items-center bg-slate-50"><p className="text-sm text-slate-600">Loading map…</p></div>}><MainMapView /></Suspense></div>
  </div>;
}
