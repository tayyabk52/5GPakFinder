import { Suspense } from "react";
import MainMapView from "@/components/MainMapView";

/**
 * Root page — server component shell.
 * Wraps the client-side map in Suspense for useSearchParams().
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-dvh bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading Pakistan 5G Map…</p>
          </div>
        </div>
      }
    >
      <MainMapView />
    </Suspense>
  );
}
