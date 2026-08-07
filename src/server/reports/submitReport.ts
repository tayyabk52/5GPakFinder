import type { ReportSubmission, SubmitOk } from "@/features/coverage-reports/types";
import { encodeGeohash } from "@/features/coverage-reports/geohash/geohash";
import { computeTrustScore } from "@/features/coverage-reports/trust/computeTrustScore";
import { statusForTrust } from "@/features/coverage-reports/trust/trustTiers";
import { runAntiFraud } from "@/server/reports/antiFraud";
import type { Repository, ReportRow } from "@/server/reports/repository";

export interface SubmitDeps {
  submission: ReportSubmission;
  ipHash: string;
  ipRegionFar: boolean;
  repository: Repository;
}

export async function submitReport(
  deps: SubmitDeps
): Promise<SubmitOk | { ok: false; reason: string }> {
  const { submission, ipHash, ipRegionFar, repository } = deps;

  const fraud = await runAntiFraud({
    submission,
    ipHash,
    ipRegionFar,
    checkRateLimit: (hash, fingerprint) => repository.checkRateLimit(hash, fingerprint),
  });

  if (!fraud.pass) {
    return { ok: false, reason: fraud.reason ?? "Report rejected." };
  }

  const trustScore = computeTrustScore({
    speed: submission.speed,
    accuracyMeters: submission.accuracyMeters,
    isManualPin: submission.isManualPin,
    ipRegionFar,
  });
  const status = statusForTrust(trustScore);

  const row: ReportRow = {
    latitude: submission.latitude,
    longitude: submission.longitude,
    geohash: encodeGeohash(submission.latitude, submission.longitude, 7),
    accuracy_meters: submission.accuracyMeters,
    is_manual_pin: submission.isManualPin,
    operator: submission.operator,
    speed_source: submission.speed?.source ?? null,
    download_mbps: submission.speed?.downloadMbps ?? null,
    upload_mbps: submission.speed?.uploadMbps ?? null,
    ping_ms: submission.speed?.pingMs ?? null,
    speedtest_url: submission.speed?.speedtestUrl ?? null,
    device_model: submission.speed?.deviceModel ?? null,
    carrier: submission.speed?.carrier ?? null,
    isp: submission.speed?.isp ?? null,
    server_name: submission.speed?.serverName ?? null,
    wifi_device_model: submission.speed?.wifiDeviceModel ?? null,
    device_fingerprint: submission.deviceFingerprint,
    ip_hash: ipHash,
    trust_score: trustScore,
    status,
  };

  await repository.insertReport(row);
  return { ok: true, trustScore, status };
}
