import type { CoverageCell, ReportSubmission, SubmitOk } from "@/features/coverage-reports/types";
import { CoverageCellsResponseSchema } from "@/features/coverage-reports/schemas/report.schema";
import type { NetworkGeneration } from "@/features/coverage-reports/types";

export type SubmitResult = SubmitOk | { ok: false; reason: string };

export async function submitReport(body: ReportSubmission): Promise<SubmitResult> {
  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    if (response.ok && json.ok) {
      return { ok: true, trustScore: json.trustScore, status: json.status };
    }

    return { ok: false, reason: json.reason ?? "Could not submit your report." };
  } catch {
    return { ok: false, reason: "Network error. Please check your connection and try again." };
  }
}

export interface CellQueryInput {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom: number;
  verifiedOnly: boolean;
  generation: NetworkGeneration;
}

export async function fetchCoverageCells(query: CellQueryInput): Promise<CoverageCell[]> {
  const params = new URLSearchParams({
    minLat: String(query.minLat),
    minLng: String(query.minLng),
    maxLat: String(query.maxLat),
    maxLng: String(query.maxLng),
    zoom: String(query.zoom),
    verified: String(query.verifiedOnly),
    generation: query.generation,
  });

  try {
    const response = await fetch(`/api/reports?${params.toString()}`);
    if (!response.ok) {
      return [];
    }

    const parsed = CoverageCellsResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.cells : [];
  } catch {
    return [];
  }
}
