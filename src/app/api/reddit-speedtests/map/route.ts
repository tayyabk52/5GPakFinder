import { NextResponse } from "next/server";
import { mapQuerySchema } from "@/features/reddit-speedtests/schema";
import { getRedditMapData } from "@/server/reddit-speedtests/repository";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = mapQuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid map filters." }, { status: 400 });
  try {
    return NextResponse.json(await getRedditMapData(parsed.data), { headers: { "cache-control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("GET Reddit map failed", error);
    return NextResponse.json({ error: "Reddit map samples are temporarily unavailable." }, { status: 500 });
  }
}
