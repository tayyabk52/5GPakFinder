import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const generation = new URL(req.url).searchParams.get("generation") === "4g" ? "4g" : "5g";
  try {
    const { data, error } = await createSupabaseServerClient().rpc("get_coverage_insights", { p_generation: generation });
    if (error) throw error;
    // Let clients discard a response that belonged to a previous technology tab.
    return NextResponse.json({ generation, insights: data ?? null }, { headers: { "cache-control": "no-store, max-age=0, must-revalidate" } });
  } catch (error) {
    console.error("GET /api/insights failed", error);
    return NextResponse.json({ insights: null, error: "Insights are temporarily unavailable." }, { status: 500 });
  }
}
