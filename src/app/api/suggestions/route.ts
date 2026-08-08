import { NextResponse } from "next/server";
import { SuggestionSchema } from "@/features/suggestions/schema";
import { suggestionRepository } from "@/server/suggestions/repository";
import { hashIp } from "@/server/reports/ipHash";
import { clientIp, isTrustedMutationRequest } from "@/server/security/request";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 12 * 1024;

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) return NextResponse.json({ ok: false, reason: "Cross-site submissions are not allowed." }, { status: 403 });
  const length = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, reason: "Suggestion is too large." }, { status: 413 });
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) return NextResponse.json({ ok: false, reason: "Expected a JSON suggestion." }, { status: 415 });

  const raw = await req.json().catch(() => null);
  const parsed = SuggestionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "Please provide a clear, structured suggestion." }, { status: 400 });

  const salt = process.env.SUPABASE_IP_HASH_SALT;
  if (!salt) return NextResponse.json({ ok: false, reason: "Suggestions are temporarily unavailable." }, { status: 503 });
  try {
    const ipHash = hashIp(clientIp(req), salt);
    const gate = await suggestionRepository.checkGate(ipHash, parsed.data.deviceFingerprint);
    if (gate !== "allowed") return NextResponse.json({ ok: false, reason: gate === "blocked" ? "This device cannot submit more suggestions." : "Please wait before submitting another suggestion." }, { status: gate === "blocked" ? 403 : 429 });
    await suggestionRepository.insert(parsed.data, ipHash);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/suggestions failed", error);
    return NextResponse.json({ ok: false, reason: "Could not submit your suggestion. Please try again." }, { status: 500 });
  }
}
