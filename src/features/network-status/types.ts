export const OPERATORS = ["Jazz", "Zong", "Ufone"] as const;
export const ISSUE_TYPES = ["no_signal", "no_internet", "slow_data", "calls_sms", "specific_app"] as const;
export type NetworkOperator = (typeof OPERATORS)[number];
export type IssueType = (typeof ISSUE_TYPES)[number];
export type ReportState = "affected" | "working";
export type IncidentStatus = "possible" | "high_agreement" | "recovering" | "resolved";

export interface OutageSubmission {
  latitude: number; longitude: number; accuracyMeters: number | null; isManualPin: boolean;
  operator: NetworkOperator; state: ReportState; issueType: IssueType | null; deviceFingerprint: string;
}
export interface AffectedCell {
  geohashPrefix: string; centerLat: number; centerLng: number; operator: NetworkOperator;
  reportCount: number; confidence: number; status: Exclude<IncidentStatus, "resolved">;
  firstReportedAt: string; issueBreakdown: Partial<Record<IssueType, number>>;
}
export interface IncidentSummary {
  operator: NetworkOperator; status: IncidentStatus; count: number; medianDurationMinutes: number | null;
  totalAffectedMinutes: number; issueBreakdown: Partial<Record<IssueType, number>>;
}
export interface HistoryOverview {
  incidentCount: number;
  medianDurationMinutes: number | null;
  totalAffectedMinutes: number;
}
export interface HistoryDay { day: string; incidentCount: number; }
