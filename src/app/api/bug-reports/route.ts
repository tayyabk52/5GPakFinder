import { NextResponse } from "next/server";
import { BugReportSchema } from "@/features/bug-reports/schema";
import { bugRepository } from "@/server/bugs/repository";
import { hashIp } from "@/server/reports/ipHash";
import { clientIp, isTrustedMutationRequest } from "@/server/security/request";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 12 * 1024;
export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) return NextResponse.json({ ok: false, reason: "Cross-site submissions are not allowed." }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ ok: false, reason: "Bug report is too large." }, { status: 413 });
  if (!req.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ ok: false, reason: "Expected a JSON bug report." }, { status: 415 });
  const raw = await req.json().catch(() => null);
  const parsed = BugReportSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "Please complete each field with a clear description." }, { status: 400 });
  const salt = process.env.SUPABASE_IP_HASH_SALT;
  if (!salt) return NextResponse.json({ ok: false, reason: "Bug reports are temporarily unavailable." }, { status: 503 });
  try {
    const ipHash = hashIp(clientIp(req), salt);
    const gate = await bugRepository.checkGate(ipHash, parsed.data.deviceFingerprint);
    if (gate !== "allowed") return NextResponse.json({ ok: false, reason: gate === "blocked" ? "This device cannot submit more bug reports." : "Please wait before submitting another bug report." }, { status: gate === "blocked" ? 403 : 429 });
    await bugRepository.insert(parsed.data, ipHash, req.headers.get("user-agent")?.slice(0, 500) ?? null);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { console.error("POST /api/bug-reports failed", error); return NextResponse.json({ ok: false, reason: "Could not submit your bug report. Please try again." }, { status: 500 }); }
}
