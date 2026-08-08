import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, reason: "Upload test payload is too large." }, { status: 413 });
  }
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, reason: "Upload test payload is too large." }, { status: 413 });
  }
  return NextResponse.json(
    { bytes: bytes.byteLength },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
