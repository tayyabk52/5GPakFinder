"use client";

import { useEffect, useState } from "react";

export function useFingerprint(): { fingerprint: string | null; isReady: boolean } {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const agent = await FingerprintJS.load();
        const result = await agent.get();

        if (!cancelled) {
          setFingerprint(result.visitorId);
        }
      } catch {
        if (!cancelled) {
          setFingerprint(null);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { fingerprint, isReady: fingerprint !== null };
}
