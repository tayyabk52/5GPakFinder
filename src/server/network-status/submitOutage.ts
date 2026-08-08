import { encodeGeohash } from "@/features/coverage-reports/geohash/geohash";
import type { OutageSubmission } from "@/features/network-status/types";
import { outageTrust } from "./lifecycle";
import type { OutageRepository } from "./repository";

export async function submitOutageReport(input: { submission: OutageSubmission; ipHash: string; ipRegionFar: boolean; repository: OutageRepository }) {
  const geohash = encodeGeohash(input.submission.latitude, input.submission.longitude, 7);
  const gate = await input.repository.checkOutageGate(input.ipHash, input.submission.deviceFingerprint, geohash.slice(0, 6), input.submission.operator);
  if (gate !== "allowed") return { ok: false as const, reason: gate === "duplicate" ? "You already reported this operator in this area recently." : gate === "blocked" ? "This device is temporarily blocked." : "Too many outage reports. Please try again later." };
  const trustScore = outageTrust({ accuracyMeters: input.submission.accuracyMeters, isManualPin: input.submission.isManualPin, ipRegionFar: input.ipRegionFar });
  await input.repository.insertOutageReport({ ...input.submission, geohash, ipHash: input.ipHash, trustScore });
  return { ok: true as const, trustScore };
}
