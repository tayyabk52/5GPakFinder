import { NextResponse } from "next/server";
import { isTrustedMutationRequest } from "@/server/security/request";
import { consumeSpeedtestBudget } from "@/server/security/speedtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) return NextResponse.json({ ok: false, reason: "Cross-site requests are not allowed." }, { status: 403 });
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, reason: "Upload test payload is too large." }, { status: 413 });
  }
  const budget = await consumeSpeedtestBudget(req, "upload");
  if (budget === "rate_limited") return NextResponse.json({ ok: false, reason: "Please wait before running another speed test." }, { status: 429, headers: { "cache-control": "no-store" } });
  if (budget === "unavailable") return NextResponse.json({ ok: false, reason: "Speed tests are temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, reason: "Upload test payload is too large." }, { status: 413 });
  }
  return NextResponse.json(
    { bytes: bytes.byteLength },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
