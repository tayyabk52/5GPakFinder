import { NextResponse } from "next/server";
import { ReportSubmissionSchema } from "@/features/coverage-reports/schemas/report.schema";
import { submitReport } from "@/server/reports/submitReport";
import { supabaseRepository } from "@/server/reports/repository";
import { hashIp } from "@/server/reports/ipHash";
import { haversineDistanceKm } from "@/lib/haversine";
import { precisionForZoom } from "@/features/coverage-reports/geohash/geohash";
import { VERIFIED_ONLY_THRESHOLD, VISIBLE_TRUST_THRESHOLD } from "@/features/coverage-reports/trust/trustTiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IP_REGION_FAR_KM = 300;

function clientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

function isIpRegionFar(req: Request, lat: number, lng: number): boolean {
  const ipLat = parseFloat(req.headers.get("x-vercel-ip-latitude") ?? "");
  const ipLng = parseFloat(req.headers.get("x-vercel-ip-longitude") ?? "");

  if (Number.isNaN(ipLat) || Number.isNaN(ipLng)) {
    return false;
  }

  return haversineDistanceKm(ipLat, ipLng, lat, lng) > IP_REGION_FAR_KM;
}

export async function POST(req: Request) {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON." }, { status: 400 });
  }

  const parsed = ReportSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "Invalid report data." }, { status: 400 });
  }

  const submission = parsed.data;
  const salt = process.env.SUPABASE_IP_HASH_SALT;
  if (!salt) {
    console.error("SUPABASE_IP_HASH_SALT is not configured.");
    return NextResponse.json({ ok: false, reason: "Report submissions are temporarily unavailable." }, { status: 503 });
  }
  const ipHash = hashIp(clientIp(req), salt);
  const ipRegionFar = isIpRegionFar(req, submission.latitude, submission.longitude);

  try {
    const result = await submitReport({
      submission,
      ipHash,
      ipRegionFar,
      repository: supabaseRepository,
    });

    if (!result.ok) {
      const status = /too many/i.test(result.reason) ? 429 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const toNumber = (key: string) => parseFloat(url.searchParams.get(key) ?? "");

  const minLat = toNumber("minLat");
  const minLng = toNumber("minLng");
  const maxLat = toNumber("maxLat");
  const maxLng = toNumber("maxLng");
  const zoom = toNumber("zoom");

  if ([minLat, minLng, maxLat, maxLng, zoom].some(Number.isNaN) || minLat < 23 || maxLat > 37 || minLng < 60 || maxLng > 78 || minLat >= maxLat || minLng >= maxLng || zoom < 0 || zoom > 22) {
    return NextResponse.json({ cells: [] }, { status: 200 });
  }

  const verifiedOnly = url.searchParams.get("verified") === "true";

  try {
    const cells = await supabaseRepository.getCoverageCells({
      minLat,
      minLng,
      maxLat,
      maxLng,
      precision: precisionForZoom(zoom),
      minTrust: verifiedOnly ? VERIFIED_ONLY_THRESHOLD : VISIBLE_TRUST_THRESHOLD,
      verifiedOnly,
    });

    return NextResponse.json({ cells }, { status: 200, headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("GET /api/reports ERROR:", error);
    return NextResponse.json({ cells: [] }, { status: 500 });
  }
}
