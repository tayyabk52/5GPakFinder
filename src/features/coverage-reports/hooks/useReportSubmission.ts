"use client";

import { useCallback, useState } from "react";
import type { ReportSubmission, SubmitOk } from "@/features/coverage-reports/types";
import { submitReport as postReport } from "@/features/coverage-reports/api/reportsClient";

export type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export function useReportSubmission() {
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [result, setResult] = useState<SubmitOk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (body: ReportSubmission) => {
    setStatus("submitting");
    setError(null);

    const response = await postReport(body);
    if (response.ok) {
      setResult(response);
      setStatus("success");
    } else {
      setError(response.reason);
      setStatus("error");
    }

    return response;
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, submit, reset };
}
