import { Suspense } from "react";
import MainMapView from "@/components/MainMapView";
export default function MapPage() { return <Suspense fallback={<div className="grid h-full place-items-center bg-slate-50"><p className="text-sm text-slate-600">Loading map…</p></div>}><MainMapView /></Suspense>; }
