import { readFile } from "node:fs/promises";
import { MANIFEST_PATH, readReviewRows, sha256, REVIEW_PATH } from "./shared";

async function main() {
const rows = await readReviewRows();
const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as { datasetVersion: string; sourcePostCount: number };
const postIds = new Set(rows.map((row) => row.post_id));
const observationKeys = new Set(rows.map((row) => row.observation_key));
if (postIds.size !== manifest.sourcePostCount) throw new Error(`Expected ${manifest.sourcePostCount} posts, found ${postIds.size}.`);
if (observationKeys.size !== rows.length) throw new Error("Duplicate observation keys found.");
if (rows.some((row) => row.dataset_version !== manifest.datasetVersion)) throw new Error("Dataset versions do not match the manifest.");

const counts = Object.fromEntries(["approved", "needs_review", "unresolved", "excluded"].map((status) => [status, rows.filter((row) => row.review_status === status).length]));
console.log(JSON.stringify({ reviewSha256: await sha256(REVIEW_PATH), rows: rows.length, uniquePosts: postIds.size, ...counts }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
