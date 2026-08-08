import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const secret = process.env.NETWORK_STATUS_CRON_SECRET;
  const authorization = req.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  const authorized = Boolean(secret) && authorization.length === expected.length && timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
  if (!authorized) return NextResponse.json({ ok: false }, { status: 401 });
  try { const { error } = await createSupabaseServerClient().rpc("reconcile_network_incidents"); if (error) throw error; return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
