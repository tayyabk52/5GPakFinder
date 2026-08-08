import { NextResponse } from "next/server";
import { supabaseOutageRepository } from "@/server/network-status/repository";
export const dynamic = "force-dynamic";
export async function GET(req: Request) { const p = new URL(req.url).searchParams; const days = p.get("days") === "30" ? 30 : 7; const operator = p.get("operator"); if (operator && !["Jazz", "Zong", "Ufone"].includes(operator)) return NextResponse.json({ incidents: [] }); try { return NextResponse.json({ incidents: await supabaseOutageRepository.getSummaries(days, operator ?? undefined) }); } catch { return NextResponse.json({ incidents: [] }, { status: 500 }); } }
