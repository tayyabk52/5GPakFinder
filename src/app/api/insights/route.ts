import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await createSupabaseServerClient().rpc("get_coverage_insights");
    if (error) throw error;
    return NextResponse.json({ insights: data ?? null }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("GET /api/insights failed", error);
    return NextResponse.json({ insights: null, error: "Insights are temporarily unavailable." }, { status: 500 });
  }
}
