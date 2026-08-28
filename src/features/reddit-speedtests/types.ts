export const REDDIT_DATASET_VERSION = "reddit-pakistani-tech-2026-08-28-v1";

export type RedditGeneration = "4g" | "5g";
export type ReviewStatus = "approved" | "needs_review" | "unresolved" | "excluded";
export type LocationMethod = "source_coordinates" | "named_landmark" | "area_centroid" | "city_centroid" | "multi_area_centroid" | "unmapped";
export type Confidence = "high" | "medium" | "low" | "none";

export interface RedditObservation {
  id: string;
  observationKey: string;
  postId: string;
  title: string;
  postUrl: string;
  createdAt: string;
  accessType: string;
  generation: RedditGeneration | null;
  reportedBrand: string | null;
  networkGroup: string | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  jitterMs: number | null;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  locationMethod: LocationMethod;
  locationConfidence: Confidence;
  locationNote: string | null;
  metricsSource: string;
  extractionConfidence: Confidence;
  reviewStatus: ReviewStatus;
  exclusionReason: string | null;
  evidenceUrl: string | null;
  speedtestUrl: string | null;
  reviewerNote: string | null;
}

export interface RedditSummaryGroup {
  name: string;
  observationCount: number;
  postCount: number;
  medianDownload: number | null;
  meanDownload: number | null;
  p90Download: number | null;
  medianPing: number | null;
}

export interface RedditSummary {
  datasetVersion: string;
  sourcePostCount: number;
  observationCount: number;
  mappedObservationCount: number;
  unresolvedCount: number;
  excludedCount: number;
  needsReviewCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  medianDownload: number | null;
  meanDownload: number | null;
  p90Download: number | null;
  medianPing: number | null;
  networks: RedditSummaryGroup[];
  cities: RedditSummaryGroup[];
}

export interface RedditMapProperties {
  observationId: string;
  postId: string;
  title: string;
  postUrl: string;
  createdAt: string;
  generation: RedditGeneration;
  reportedBrand: string;
  networkGroup: string;
  downloadMbps: number;
  uploadMbps: number | null;
  pingMs: number | null;
  city: string | null;
  area: string | null;
  locationMethod: LocationMethod;
  locationConfidence: Confidence;
  metricsSource: string;
  extractionConfidence: Confidence;
}

export type RedditMapCollection = GeoJSON.FeatureCollection<GeoJSON.Point, RedditMapProperties>;
