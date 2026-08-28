import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { reviewRowSchema, type ReviewRow } from "../../src/features/reddit-speedtests/schema";

export const ROOT = path.resolve(process.cwd());
export const DATA_DIR = path.join(ROOT, "data/reddit-speedtests/v1");
export const REVIEW_PATH = path.join(DATA_DIR, "review-decisions.csv");
export const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

export async function sha256(filePath: string) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex").toUpperCase();
}

export async function readReviewRows(): Promise<ReviewRow[]> {
  const records = parse(await readFile(REVIEW_PATH, "utf8"), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: false }) as Record<string, string>[];
  return records.map((record, index) => {
    const result = reviewRowSchema.safeParse(record);
    if (!result.success) throw new Error(`Invalid review row ${index + 2}: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    return result.data;
  });
}

export function nullableNumber(value: number | "") {
  return value === "" ? null : value;
}
