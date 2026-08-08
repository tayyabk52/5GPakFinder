import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AffectedCell, IncidentSummary, OutageSubmission } from "@/features/network-status/types";

export interface OutageRepository {
  checkOutageGate(ipHash: string, fingerprint: string, geohash: string, operator: string): Promise<"allowed" | "rate_limited" | "duplicate" | "blocked">;
  insertOutageReport(row: OutageSubmission & { geohash: string; ipHash: string; trustScore: number }): Promise<void>;
  getAffectedCells(query: { minLat: number; minLng: number; maxLat: number; maxLng: number; precision: number; operator?: string }): Promise<AffectedCell[]>;
  getSummaries(days: number, operator?: string): Promise<IncidentSummary[]>;
}
export const supabaseOutageRepository: OutageRepository = {
  async checkOutageGate(ipHash, fingerprint, geohash, operator) { const { data, error } = await createSupabaseServerClient().rpc("check_outage_submission", { p_ip_hash: ipHash, p_fingerprint: fingerprint, p_geohash: geohash, p_operator: operator }); if (error) throw error; if (["allowed", "rate_limited", "duplicate", "blocked"].includes(data)) return data; throw new Error("Invalid outage gate response."); },
  async insertOutageReport(row) { const { error } = await createSupabaseServerClient().from("outage_reports").insert({ latitude: row.latitude, longitude: row.longitude, geohash: row.geohash, accuracy_meters: row.accuracyMeters, is_manual_pin: row.isManualPin, operator: row.operator, report_state: row.state, issue_type: row.issueType, device_fingerprint: row.deviceFingerprint, ip_hash: row.ipHash, trust_score: row.trustScore }); if (error) throw error; },
  async getAffectedCells(query) { const { data, error } = await createSupabaseServerClient().rpc("get_affected_cells", { min_lat: query.minLat, min_lng: query.minLng, max_lat: query.maxLat, max_lng: query.maxLng, p_precision: query.precision, p_operator: query.operator ?? null }); if (error) throw error; return (data ?? []).map((r: any) => ({ geohashPrefix: r.geohash_prefix, centerLat: r.center_lat, centerLng: r.center_lng, operator: r.operator, reportCount: Number(r.report_count), confidence: Number(r.confidence), status: r.status, firstReportedAt: r.first_reported_at, issueBreakdown: r.issue_breakdown ?? {} })); },
  async getSummaries(days, operator) { const { data, error } = await createSupabaseServerClient().rpc("get_network_history", { p_days: days, p_operator: operator ?? null }); if (error) throw error; return (data ?? []).map((r: any) => ({ operator: r.operator, status: r.status, count: Number(r.incident_count), medianDurationMinutes: r.median_duration_minutes === null ? null : Number(r.median_duration_minutes), totalAffectedMinutes: Number(r.total_affected_minutes), issueBreakdown: r.issue_breakdown ?? {} })); },
};
