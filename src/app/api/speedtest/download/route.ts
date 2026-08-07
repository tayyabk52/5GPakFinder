import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = parseInt(url.searchParams.get("bytes") ?? "5000000", 10);
  const bytes = Math.max(0, Math.min(Number.isNaN(requested) ? 0 : requested, MAX_BYTES));
  const payload = new Uint8Array(bytes);

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "no-store, no-cache, must-revalidate",
      "content-length": String(bytes),
    },
  });
}
