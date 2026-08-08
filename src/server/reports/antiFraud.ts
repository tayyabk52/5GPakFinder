import type { ReportSubmission } from "@/features/coverage-reports/types";

export interface AntiFraudDeps {
  submission: ReportSubmission;
  ipHash: string;
  ipRegionFar: boolean;
  checkSubmissionGate: (ipHash: string, deviceFingerprint: string) => Promise<"allowed" | "rate_limited" | "blocked">;
}

export interface AntiFraudResult {
  pass: boolean;
  reason?: string;
}

export async function runAntiFraud(deps: AntiFraudDeps): Promise<AntiFraudResult> {
  const decision = await deps.checkSubmissionGate(deps.ipHash, deps.submission.deviceFingerprint);
  if (decision === "blocked") {
    return { pass: false, reason: "This device can no longer submit coverage reports." };
  }
  if (decision !== "allowed") {
    return { pass: false, reason: "Too many reports recently." };
  }

  return { pass: true };
}
