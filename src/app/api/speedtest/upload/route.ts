import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bytes = await req.arrayBuffer();
  return NextResponse.json(
    { bytes: bytes.byteLength },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
