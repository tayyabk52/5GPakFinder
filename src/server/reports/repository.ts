import { z } from "zod";
import type { CoverageCell } from "@/features/coverage-reports/types";
import { CoverageCellSchema } from "@/features/coverage-reports/schemas/report.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ReportRow {
  latitude: number;
  longitude: number;
  geohash: string;
  accuracy_meters: number | null;
  is_manual_pin: boolean;
  operator: "Jazz" | "Zong" | "Ufone";
  speed_source: "desktop" | "mobile" | "manual" | null;
  download_mbps: number | null;
  upload_mbps: number | null;
  ping_ms: number | null;
  speedtest_url: string | null;
  device_model?: string | null;
  carrier?: string | null;
  isp?: string | null;
  server_name?: string | null;
  wifi_device_model?: string | null;
  device_fingerprint: string;
  ip_hash: string;
  trust_score: number;
  status: "visible" | "hidden";
}

export interface CoverageCellQuery {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  precision: number;
  minTrust: number;
  verifiedOnly: boolean;
}

export interface Repository {
  checkRateLimit(ipHash: string, deviceFingerprint: string): Promise<boolean>;
  insertReport(row: ReportRow): Promise<void>;
  getCoverageCells(query: CoverageCellQuery): Promise<CoverageCell[]>;
}

type CoverageCellRow = z.infer<typeof CoverageCellSchema>;

function mapCoverageCell(row: CoverageCellRow): CoverageCell {
  return CoverageCellSchema.parse(row);
}

export const supabaseRepository: Repository = {
  async checkRateLimit(ipHash, deviceFingerprint) {
    const client = createSupabaseServerClient();
    const { data, error } = await client.rpc("check_rate_limit", {
      p_ip_hash: ipHash,
      p_fingerprint: deviceFingerprint,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  },

  async insertReport(row) {
    const client = createSupabaseServerClient();
    const { error } = await client.from("reports").insert(row);
    if (error) {
      throw error;
    }
  },

  async getCoverageCells(query) {
    const client = createSupabaseServerClient();
    const { data, error } = await client.rpc("get_coverage_cells", {
      min_lat: query.minLat,
      min_lng: query.minLng,
      max_lat: query.maxLat,
      max_lng: query.maxLng,
      p_precision: query.precision,
      p_min_trust: query.minTrust,
      p_verified_only: query.verifiedOnly,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    const camelData = data.map((row: any) => ({
      geohashPrefix: row.geohash_prefix,
      centerLat: row.center_lat,
      centerLng: row.center_lng,
      total: row.total,
      avgDownload: row.avg_download,
      avgUpload: row.avg_upload,
      avgPing: row.avg_ping,
      avgTrust: row.avg_trust,
      jazzCount: row.jazz_count,
      jazzAvgDownload: row.jazz_avg_download,
      zongCount: row.zong_count,
      zongAvgDownload: row.zong_avg_download,
      ufoneCount: row.ufone_count,
      ufoneAvgDownload: row.ufone_avg_download,
    }));

    return z.array(CoverageCellSchema).parse(camelData).map(mapCoverageCell);
  },
};
