import { NextResponse } from "next/server";

const SPEEDTEST_RESULT_RE =
  /^https:\/\/(?:www\.)?speedtest\.net\/result\/(i\/)?(\d+)\/?$/i;

export const runtime = "nodejs";

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

function normalizeSpeedtestResult(raw: any, meta: any) {
  const toMbps = (v: any) =>
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

    const raw = await res.json();
    const data = normalizeSpeedtestResult(raw, meta);

    if (data.downloadMbps == null || data.uploadMbps == null) {
      return NextResponse.json(
        { ok: false, reason: "Speedtest payload incomplete (missing speeds)." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Speedtest resolution error:", error);
    return NextResponse.json(
      { ok: false, reason: "Internal server error resolving speedtest URL." },
      { status: 500 }
    );
  }
}
