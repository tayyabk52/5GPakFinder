import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AffectedCell, HistoryDay, HistoryOverview, IncidentSummary, OutageSubmission } from "@/features/network-status/types";

export interface OutageRepository {
  checkOutageGate(ipHash: string, fingerprint: string, geohash: string, operator: string): Promise<"allowed" | "rate_limited" | "duplicate" | "blocked">;
  insertOutageReport(row: OutageSubmission & { geohash: string; ipHash: string; trustScore: number }): Promise<void>;
  getAffectedCells(query: { minLat: number; minLng: number; maxLat: number; maxLng: number; precision: number; operator?: string }): Promise<AffectedCell[]>;
  getSummaries(days: number, operator?: string): Promise<IncidentSummary[]>;
  getHistoryOverview(days: number, operator?: string): Promise<HistoryOverview>;
  getHistoryDaily(days: number, operator?: string): Promise<HistoryDay[]>;
  getHistoryDashboard(days: number, operator?: string): Promise<{ incidents: IncidentSummary[]; daily: HistoryDay[]; overview: HistoryOverview }>;
}
export const supabaseOutageRepository: OutageRepository = {
  async checkOutageGate(ipHash, fingerprint, geohash, operator) { const { data, error } = await createSupabaseServerClient().rpc("check_outage_submission", { p_ip_hash: ipHash, p_fingerprint: fingerprint, p_geohash: geohash, p_operator: operator }); if (error) throw error; if (["allowed", "rate_limited", "duplicate", "blocked"].includes(data)) return data; throw new Error("Invalid outage gate response."); },
  async insertOutageReport(row) { const { error } = await createSupabaseServerClient().from("outage_reports").insert({ latitude: row.latitude, longitude: row.longitude, geohash: row.geohash, accuracy_meters: row.accuracyMeters, is_manual_pin: row.isManualPin, operator: row.operator, report_state: row.state, issue_type: row.issueType, device_fingerprint: row.deviceFingerprint, ip_hash: row.ipHash, trust_score: row.trustScore }); if (error) throw error; },
  async getAffectedCells(query) { const { data, error } = await createSupabaseServerClient().rpc("get_affected_cells", { min_lat: query.minLat, min_lng: query.minLng, max_lat: query.maxLat, max_lng: query.maxLng, p_precision: query.precision, p_operator: query.operator ?? null }); if (error) throw error; return (data ?? []).map((r: any) => ({ geohashPrefix: r.geohash_prefix, centerLat: r.center_lat, centerLng: r.center_lng, operator: r.operator, reportCount: Number(r.report_count), confidence: Number(r.confidence), status: r.status, firstReportedAt: r.first_reported_at, issueBreakdown: r.issue_breakdown ?? {} })); },
  async getSummaries(days, operator) { const { data, error } = await createSupabaseServerClient().rpc("get_network_history", { p_days: days, p_operator: operator ?? null }); if (error) throw error; return (data ?? []).map((r: any) => ({ operator: r.operator, status: r.status, count: Number(r.incident_count), medianDurationMinutes: r.median_duration_minutes === null ? null : Number(r.median_duration_minutes), totalAffectedMinutes: Number(r.total_affected_minutes), issueBreakdown: r.issue_breakdown ?? {} })); },
  async getHistoryOverview(days, operator) { const { data, error } = await createSupabaseServerClient().rpc("get_network_history_overview", { p_days: days, p_operator: operator ?? null }).maybeSingle(); if (error) throw error; const row = data as { incident_count?: number; median_duration_minutes?: number | null; total_affected_minutes?: number } | null; return { incidentCount: Number(row?.incident_count ?? 0), medianDurationMinutes: row?.median_duration_minutes === null || row?.median_duration_minutes === undefined ? null : Number(row.median_duration_minutes), totalAffectedMinutes: Number(row?.total_affected_minutes ?? 0) }; },
  async getHistoryDaily(days, operator) { const { data, error } = await createSupabaseServerClient().rpc("get_network_history_daily", { p_days: days, p_operator: operator ?? null }); if (error) throw error; return (data ?? []).map((r: any) => ({ day: r.day, incidentCount: Number(r.incident_count) })); },
  async getHistoryDashboard(days, operator) {
    const client = createSupabaseServerClient();
    const { data, error } = await client.rpc("get_network_history_dashboard", { p_days: days, p_operator: operator ?? null });
    if (error) {
      // Keep the history page available while a deployment is ahead of the SQL migration.
      if (error.code !== "42883") throw error;
      const [incidents, daily, overview] = await Promise.all([
        this.getSummaries(days, operator), this.getHistoryDaily(days, operator), this.getHistoryOverview(days, operator),
      ]);
      return { incidents, daily, overview };
    }
    const result = (data ?? {}) as { incidents?: Array<Record<string, unknown>>; daily?: Array<Record<string, unknown>>; overview?: Record<string, unknown> };
    return {
      incidents: (result.incidents ?? []).map((row) => ({ operator: String(row.operator) as IncidentSummary["operator"], status: String(row.status) as IncidentSummary["status"], count: Number(row.incidentCount), medianDurationMinutes: row.medianDurationMinutes === null || row.medianDurationMinutes === undefined ? null : Number(row.medianDurationMinutes), totalAffectedMinutes: Number(row.totalAffectedMinutes), issueBreakdown: ((row.issueBreakdown as Record<string, number>) ?? {}) as IncidentSummary["issueBreakdown"] })),
      daily: (result.daily ?? []).map((row) => ({ day: String(row.day), incidentCount: Number(row.incidentCount) })),
      overview: { incidentCount: Number(result.overview?.incidentCount ?? 0), medianDurationMinutes: result.overview?.medianDurationMinutes === null || result.overview?.medianDurationMinutes === undefined ? null : Number(result.overview.medianDurationMinutes), totalAffectedMinutes: Number(result.overview?.totalAffectedMinutes ?? 0) },
    };
  },
};
