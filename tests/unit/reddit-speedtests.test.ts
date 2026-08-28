import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { reviewRowSchema } from "@/features/reddit-speedtests/schema";

const file = path.resolve(process.cwd(), "data/reddit-speedtests/v1/review-decisions.csv");
const rows = (parse(readFileSync(file, "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[]).map((row) => reviewRowSchema.parse(row));

describe("Reddit speed-test review snapshot", () => {
  it("accounts for every source post with stable observation keys", () => {
    expect(rows).toHaveLength(83);
    expect(new Set(rows.map((row) => row.post_id)).size).toBe(83);
    expect(new Set(rows.map((row) => row.observation_key)).size).toBe(83);
    expect(Object.fromEntries(["approved", "needs_review", "unresolved", "excluded"].map((status) => [status, rows.filter((row) => row.review_status === status).length]))).toEqual({ approved: 49, needs_review: 6, unresolved: 13, excluded: 15 });
  });

  it("only approves attributable cellular measurements", () => {
    for (const row of rows.filter((item) => item.review_status === "approved")) {
      expect(row.access_type).toBe("cellular");
      expect(row.generation).toMatch(/^(4g|5g)$/);
      expect(row.reported_brand).not.toBe("");
      expect(row.download_mbps).not.toBe("");
    }
  });

  it("keeps map points bounded and provenance-labelled", () => {
    for (const row of rows.filter((item) => item.latitude !== "")) {
      expect(Number(row.latitude)).toBeGreaterThanOrEqual(23);
      expect(Number(row.latitude)).toBeLessThanOrEqual(37);
      expect(Number(row.longitude)).toBeGreaterThanOrEqual(60);
      expect(Number(row.longitude)).toBeLessThanOrEqual(78);
      expect(row.location_method).not.toBe("unmapped");
      expect(row.location_note.length).toBeGreaterThan(10);
    }
  });

  it("does not approve the anomalous Onic OCR result", () => {
    const row = rows.find((item) => item.post_id === "1vnoy0i");
    expect(row?.review_status).toBe("needs_review");
    expect(row?.exclusion_reason).toContain("anomalous");
  });
});
