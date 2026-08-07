import type { ReportSubmission } from "@/features/coverage-reports/types";

export interface AntiFraudDeps {
  submission: ReportSubmission;
  ipHash: string;
  ipRegionFar: boolean;
  checkRateLimit: (ipHash: string, deviceFingerprint: string) => Promise<boolean>;
}

export interface AntiFraudResult {
  pass: boolean;
  reason?: string;
}

export async function runAntiFraud(deps: AntiFraudDeps): Promise<AntiFraudResult> {
  const allowed = await deps.checkRateLimit(deps.ipHash, deps.submission.deviceFingerprint);
  if (!allowed) {
    return { pass: false, reason: "Too many reports recently." };
  }

  return { pass: true };
}
