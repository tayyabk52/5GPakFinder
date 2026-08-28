import { NextResponse } from "next/server";
import { generationSchema } from "@/features/reddit-speedtests/schema";
import { getRedditSummary } from "@/server/reddit-speedtests/repository";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const parsed = generationSchema.safeParse(new URL(request.url).searchParams.get("generation") ?? "5g");
  if (!parsed.success) return NextResponse.json({ error: "Generation must be 4g or 5g." }, { status: 400 });
  try {
    return NextResponse.json({ generation: parsed.data, summary: await getRedditSummary(parsed.data) }, { headers: { "cache-control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("GET Reddit summary failed", error);
    return NextResponse.json({ error: "Reddit sample insights are temporarily unavailable." }, { status: 500 });
  }
}
