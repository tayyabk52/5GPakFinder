import { NextResponse } from "next/server";
import { isTrustedMutationRequest } from "@/server/security/request";
import { consumeSpeedtestBudget } from "@/server/security/speedtest";

const SPEEDTEST_RESULT_RE =
  /^https:\/\/(?:www\.)?speedtest\.net\/result\/(i\/)?(\d+)\/?$/i;

export const runtime = "nodejs";
const MAX_BODY_BYTES = 2 * 1024;

function parseSpeedtestUrl(input: string) {
  const url = String(input || "").trim();
  const m = url.match(SPEEDTEST_RESULT_RE);
  if (!m) {
    throw new Error("INVALID_SPEEDTEST_URL");
  }

  const isMobile = Boolean(m[1]); // "i/" present
  const id = m[2];

  const apiUrl = isMobile
    ? `https://www.speedtest.net/api/result/i/${id}`
    : `https://www.speedtest.net/api/result/${id}`;

  return { id, isMobile, publicUrl: url, apiUrl };
}

type SpeedtestPayload = Record<string, unknown>;
type SpeedtestMeta = { id: string; isMobile: boolean; publicUrl: string; apiUrl: string };

function normalizeSpeedtestResult(raw: SpeedtestPayload, meta: SpeedtestMeta) {
  const toMbps = (v: unknown) =>
    v == null || v === "" ? null : Number((Number(v) / 1000).toFixed(2));

  const ping =
    raw.latency != null
      ? Number(raw.latency)
      : raw.idle_latency != null
        ? Number(raw.idle_latency)
        : null;

  const connectionIcon = String(raw.connection_icon || "").toLowerCase();
  const connectionType = String(raw.connection || "").toLowerCase();
  const isWifi = connectionType === "wifi" || connectionIcon === "wifi" || connectionType === "ethernet" || connectionIcon === "ethernet";

  return {
    resultId: String(raw.id || meta.id),
    resultUrl: meta.publicUrl,
    downloadMbps: toMbps(raw.download),
    uploadMbps: toMbps(raw.upload),
    pingMs: Number.isFinite(ping) ? ping : null,
    serverName: [raw.sponsor_name, raw.server_name].filter(Boolean).join(" - ") || null,
    isp: raw.isp_name || null,
    carrier: raw.display_provider_name || null,
    deviceModel: raw.model || null,
    source: meta.isMobile ? "mobile" : "desktop",
    isWifi,
  };
}

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) return NextResponse.json({ ok: false, reason: "Cross-site requests are not allowed." }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ ok: false, reason: "Request is too large." }, { status: 413 });
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) return NextResponse.json({ ok: false, reason: "Expected a JSON request." }, { status: 415 });
  const budget = await consumeSpeedtestBudget(req, "resolve");
  if (budget === "rate_limited") return NextResponse.json({ ok: false, reason: "Please wait before resolving another result." }, { status: 429, headers: { "cache-control": "no-store" } });
  if (budget === "unavailable") return NextResponse.json({ ok: false, reason: "Speedtest resolution is temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, reason: "Missing or invalid URL provided." },
        { status: 400 }
      );
    }

    let meta;
    try {
      meta = parseSpeedtestUrl(url);
    } catch {
      return NextResponse.json(
        { ok: false, reason: "Invalid Speedtest result URL." },
        { status: 400 }
      );
    }

    const res = await fetch(meta.apiUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "application/json",
        Referer: meta.publicUrl,
        "User-Agent":
          "Mozilla/5.0 (compatible; Pakistan5GMap/1.0; +https://pakistan-5g-map.vercel.app)",
      },
    });

    if (res.status === 404) {
      return NextResponse.json(
        { ok: false, reason: "Speedtest result not found." },
        { status: 404 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, reason: `Speedtest fetch failed (status: ${res.status})` },
        { status: 502 }
      );
    }

    const payload: unknown = await res.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ ok: false, reason: "Speedtest payload was invalid." }, { status: 502 });
    }
    const raw = payload as SpeedtestPayload;
    const data = normalizeSpeedtestResult(raw, meta);

    if (data.downloadMbps == null || data.uploadMbps == null) {
      return NextResponse.json(
        { ok: false, reason: "Speedtest payload incomplete (missing speeds)." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Speedtest resolution error:", error);
    return NextResponse.json(
      { ok: false, reason: "Internal server error resolving speedtest URL." },
      { status: 500 }
    );
  }
}
