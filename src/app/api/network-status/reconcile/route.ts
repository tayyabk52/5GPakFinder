import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const secret = process.env.NETWORK_STATUS_CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  try { const { error } = await createSupabaseServerClient().rpc("reconcile_network_incidents"); if (error) throw error; return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
