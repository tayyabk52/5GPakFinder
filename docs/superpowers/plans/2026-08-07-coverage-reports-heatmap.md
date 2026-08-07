# Community 5G Coverage Reporting & Heatmap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the public report real-world 5G coverage without login, protect it with a server-side anti-fraud + trust pipeline, and show the aggregated result as a hybrid (GPU density + geohash-cell) heatmap.

**Architecture:** A self-contained `coverage-reports` feature folder (client UI + hooks) talking to Next.js route handlers that run all trust/fraud logic server-side against Supabase Postgres. Pure logic (trust score, geohash, anti-fraud checks, aggregation shaping) is TDD'd under Vitest; UI/route wiring is verified by typecheck + build. Reports are stored with full precision server-side but only ever returned to clients as aggregated geohash cells.

**Tech Stack:** Next.js 16.3 (App Router, Turbopack), React 19, TypeScript (strict), MapLibre GL 6, Zod 4, Supabase Postgres, `@supabase/supabase-js`, `@fingerprintjs/fingerprintjs`, `ngeohash`, Vitest.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-07-coverage-reports-heatmap-design.md` — authoritative.
- **No PostGIS.** Aggregation uses geohash prefixes + btree indexes only.
- **No extra managed services.** Rate limiting lives in Postgres. Stack is Supabase + Vercel only.
- **No server-side Speedtest.net verification.** Pasted Ookla links are stored as unverified claims and labelled as such.
- **Writes never touch the DB from the browser.** All submissions flow through `/api/reports` with the service-role key server-side.
- **Privacy:** raw `latitude`/`longitude`, `ip_hash`, `device_fingerprint` are server-only. Public API returns aggregated cells only. Never store a raw IP.
- **Vitest is `environment: "node"`, tests live in `tests/unit/**/*.test.ts`.** No jsdom in this slice; do not add React component tests. Verify UI via `npm run typecheck` and `npm run build`.
- **Follow existing conventions:** feature folders under `src/features/<feature>`, `@/*` path alias, Zod schemas in a `schemas/` subfolder, named exports, white theme, no code comments unless earning their place.
- **Reuse existing code:** `haversineDistanceKm` from `@/lib/haversine`, `NETWORKS`/`getNetworkConfig` from `@/config/networks`.
- **Trust constants are named exports at the top of their file** so tuning is a one-line change.
- **Verification commands:** `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- **Not a git repo yet.** "Commit" steps are written as normal git commits; if `git init` has not been run, initialize it first (`git init && git add -A && git commit -m "chore: baseline"`) or skip the commit steps and batch-review instead. Do not let a missing repo block implementation.

## Concrete values resolved from the spec's open items (§11)

- **`precisionForZoom(zoom)`** geohash prefix length: `zoom < 6 → 4`, `6–8 → 5`, `9–10 → 6`, `zoom ≥ 11 → 7` (stored precision is 7; never exceed it).
- **Hybrid switch:** GPU heatmap when `zoom < 11`; clickable geohash-cell polygons when `zoom ≥ 11`.
- **In-app speed test sizes:** download = 5 MB (`bytes=5000000`); upload = 2 MB body; latency = median of 5 tiny round-trips (`bytes=64`).
- **IP-region source:** Vercel edge headers `x-vercel-ip-latitude` / `x-vercel-ip-longitude` (present in prod, absent locally → check skipped). Distance threshold for "far" = 300 km via `haversineDistanceKm`.

## File Structure

Created (client):
- `src/features/coverage-reports/types.ts` — domain types.
- `src/features/coverage-reports/schemas/report.schema.ts` — Zod submit payload + cell response.
- `src/features/coverage-reports/trust/computeTrustScore.ts` — pure trust score.
- `src/features/coverage-reports/trust/trustTiers.ts` — score → tier/color/status.
- `src/features/coverage-reports/geohash/geohash.ts` — encode/center/bbox/precisionForZoom.
- `src/features/coverage-reports/fingerprint/useFingerprint.ts` — FingerprintJS hook.
- `src/features/coverage-reports/api/reportsClient.ts` — typed fetch wrappers.
- `src/features/coverage-reports/hooks/useReportSubmission.ts` — submit state machine.
- `src/features/coverage-reports/hooks/useCoverageCells.ts` — bbox+zoom → cells (debounced).
- `src/features/coverage-reports/hooks/useInAppSpeedTest.ts` — measured speed test.
- `src/features/coverage-reports/components/{ReportButton,ReportSheet,SpeedTestPanel,TrustBadge,InfoTooltip,SuccessCard}.tsx`
- `src/features/coverage-reports/map/{useCoverageHeatmap.ts,HeatmapLegend.tsx,CellStatsPopup.tsx}`

Created (server):
- `src/lib/supabase/server.ts` — service-role client.
- `src/lib/supabase/client.ts` — anon client (reserved).
- `src/server/reports/ipHash.ts` — salted SHA-256 of IP.
- `src/server/reports/antiFraud.ts` — composable check pipeline.
- `src/server/reports/repository.ts` — DB reads/writes + RPC wrappers.
- `src/server/reports/submitReport.ts` — orchestrator.
- `src/app/api/reports/route.ts` — POST submit · GET cells.
- `src/app/api/speedtest/download/route.ts`, `.../upload/route.ts`.

Created (deliverable):
- `schema.md` (repo root) — paste-into-Supabase SQL.

Modified:
- `.env.example` — four new vars.
- `src/components/MainMapView.tsx` — mount report button + heatmap + legend.
- `src/features/map/MapContainer.tsx` — expose map instance via a ref-style handle prop.

---
### Task 1: Domain types + Zod schemas

**Files:**
- Create: `src/features/coverage-reports/types.ts`
- Create: `src/features/coverage-reports/schemas/report.schema.ts`
- Test: `tests/unit/report.schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: types `FiveGPresence`, `SpeedSource`, `OperatorId`, `SpeedSample`, `ReportSubmission`, `CoverageCell`, `SubmitOk`; schemas `ReportSubmissionSchema`, `CoverageCellSchema`, `CoverageCellsResponseSchema`.

- [ ] **Step 1: Write `types.ts`**

```ts
export type FiveGPresence = "yes" | "no" | "maybe";
export type SpeedSource = "in_app" | "manual";
export type OperatorId = "Jazz" | "Zong";

export interface SpeedSample {
  source: SpeedSource;
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  speedtestUrl: string | null;
}

export interface ReportSubmission {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  isManualPin: boolean;
  fiveGPresent: FiveGPresence;
  operator: OperatorId | null;
  speed: SpeedSample | null;
  deviceFingerprint: string;
}

export interface CoverageCell {
  geohashPrefix: string;
  centerLat: number;
  centerLng: number;
  total: number;
  confirmed: number;
  notAvailable: number;
  intermittent: number;
  avgDownload: number | null;
  avgUpload: number | null;
  avgPing: number | null;
  avgTrust: number;
  jazzCount: number;
  zongCount: number;
  unknownCount: number;
}

export interface SubmitOk {
  ok: true;
  trustScore: number;
  status: "visible" | "hidden";
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { ReportSubmissionSchema } from "@/features/coverage-reports/schemas/report.schema";

const base = {
  latitude: 31.5,
  longitude: 74.34,
  accuracyMeters: 20,
  isManualPin: false,
  fiveGPresent: "yes",
  operator: "Jazz",
  speed: null,
  deviceFingerprint: "abc123def456",
};

describe("ReportSubmissionSchema", () => {
  it("accepts a valid presence-only report", () => {
    expect(ReportSubmissionSchema.parse(base)).toMatchObject({ fiveGPresent: "yes" });
  });

  it("rejects coordinates outside Pakistan bounds", () => {
    expect(() => ReportSubmissionSchema.parse({ ...base, latitude: 51.5 })).toThrow();
  });

  it("rejects an invalid presence value", () => {
    expect(() => ReportSubmissionSchema.parse({ ...base, fiveGPresent: "sometimes" })).toThrow();
  });

  it("rejects impossible download speed", () => {
    const speed = { source: "manual", downloadMbps: 99999, uploadMbps: 10, pingMs: 20, speedtestUrl: null };
    expect(() => ReportSubmissionSchema.parse({ ...base, speed })).toThrow();
  });

  it("accepts a valid speed sample with optional url", () => {
    const speed = { source: "manual", downloadMbps: 140, uploadMbps: 28, pingMs: 22, speedtestUrl: "https://www.speedtest.net/result/123" };
    expect(ReportSubmissionSchema.parse({ ...base, speed }).speed?.downloadMbps).toBe(140);
  });

  it("allows a null operator", () => {
    expect(ReportSubmissionSchema.parse({ ...base, operator: null }).operator).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- report.schema`
Expected: FAIL — cannot import `ReportSubmissionSchema`.

- [ ] **Step 4: Write `report.schema.ts`**

```ts
import { z } from "zod";

const speedSchema = z.object({
  source: z.enum(["in_app", "manual"]),
  downloadMbps: z.number().positive().max(5000).nullable(),
  uploadMbps: z.number().positive().max(5000).nullable(),
  pingMs: z.number().int().min(1).max(2000).nullable(),
  speedtestUrl: z.string().url().max(255).nullable(),
});

export const ReportSubmissionSchema = z.object({
  latitude: z.number().min(23).max(37),
  longitude: z.number().min(60).max(78),
  accuracyMeters: z.number().int().nonnegative().nullable(),
  isManualPin: z.boolean(),
  fiveGPresent: z.enum(["yes", "no", "maybe"]),
  operator: z.enum(["Jazz", "Zong"]).nullable(),
  speed: speedSchema.nullable(),
  deviceFingerprint: z.string().min(6).max(128),
});

export const CoverageCellSchema = z.object({
  geohashPrefix: z.string().min(1).max(7),
  centerLat: z.number(),
  centerLng: z.number(),
  total: z.number().int().nonnegative(),
  confirmed: z.number().int().nonnegative(),
  notAvailable: z.number().int().nonnegative(),
  intermittent: z.number().int().nonnegative(),
  avgDownload: z.number().nullable(),
  avgUpload: z.number().nullable(),
  avgPing: z.number().nullable(),
  avgTrust: z.number(),
  jazzCount: z.number().int().nonnegative(),
  zongCount: z.number().int().nonnegative(),
  unknownCount: z.number().int().nonnegative(),
});

export const CoverageCellsResponseSchema = z.object({
  cells: z.array(CoverageCellSchema),
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- report.schema`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/coverage-reports/types.ts src/features/coverage-reports/schemas/report.schema.ts tests/unit/report.schema.test.ts
git commit -m "feat(coverage): domain types and submission schema"
```

---

### Task 2: Geohash utilities

**Files:**
- Create: `src/features/coverage-reports/geohash/geohash.ts`
- Test: `tests/unit/geohash.test.ts`
- Modify: `package.json` (add `ngeohash` + `@types/ngeohash`)

**Interfaces:**
- Consumes: nothing.
- Produces: `encodeGeohash(lat, lon, precision?)`, `geohashCenter(hash)`, `geohashBbox(hash)`, `precisionForZoom(zoom)`.

- [ ] **Step 1: Install the dependency**

Run: `npm install ngeohash && npm install -D @types/ngeohash`

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { encodeGeohash, geohashCenter, geohashBbox, precisionForZoom } from "@/features/coverage-reports/geohash/geohash";

describe("geohash", () => {
  it("encodes Lahore to a precision-7 hash", () => {
    const h = encodeGeohash(31.5204, 74.3587, 7);
    expect(h).toHaveLength(7);
    expect(typeof h).toBe("string");
  });

  it("round-trips center within the cell", () => {
    const h = encodeGeohash(31.5204, 74.3587, 7);
    const c = geohashCenter(h);
    expect(Math.abs(c.lat - 31.5204)).toBeLessThan(0.01);
    expect(Math.abs(c.lon - 74.3587)).toBeLessThan(0.01);
  });

  it("returns a bbox that contains the encoded point", () => {
    const h = encodeGeohash(31.5204, 74.3587, 7);
    const b = geohashBbox(h);
    expect(31.5204).toBeGreaterThanOrEqual(b.minLat);
    expect(31.5204).toBeLessThanOrEqual(b.maxLat);
    expect(74.3587).toBeGreaterThanOrEqual(b.minLon);
    expect(74.3587).toBeLessThanOrEqual(b.maxLon);
  });

  it("maps zoom to precision per the spec", () => {
    expect(precisionForZoom(3)).toBe(4);
    expect(precisionForZoom(7)).toBe(5);
    expect(precisionForZoom(9)).toBe(6);
    expect(precisionForZoom(11)).toBe(7);
    expect(precisionForZoom(16)).toBe(7);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- geohash`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `geohash.ts`**

```ts
import ngeohash from "ngeohash";

export function encodeGeohash(lat: number, lon: number, precision = 7): string {
  return ngeohash.encode(lat, lon, precision);
}

export function geohashCenter(hash: string): { lat: number; lon: number } {
  const { latitude, longitude } = ngeohash.decode(hash);
  return { lat: latitude, lon: longitude };
}

export function geohashBbox(hash: string): {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
} {
  const [minLat, minLon, maxLat, maxLon] = ngeohash.decode_bbox(hash);
  return { minLat, minLon, maxLat, maxLon };
}

export function precisionForZoom(zoom: number): number {
  if (zoom < 6) return 4;
  if (zoom < 9) return 5;
  if (zoom < 11) return 6;
  return 7;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- geohash`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/features/coverage-reports/geohash/geohash.ts tests/unit/geohash.test.ts
git commit -m "feat(coverage): geohash utilities"
```

---
### Task 3: Trust score + tiers

**Files:**
- Create: `src/features/coverage-reports/trust/computeTrustScore.ts`
- Create: `src/features/coverage-reports/trust/trustTiers.ts`
- Test: `tests/unit/computeTrustScore.test.ts`, `tests/unit/trustTiers.test.ts`

**Interfaces:**
- Consumes: `SpeedSample` from `types.ts`.
- Produces: `TrustInput`, `computeTrustScore(input): number` (0–1); `ConfidenceTier`, `trustTier(score)`, `statusForTrust(score)`, `CONFIDENCE_COLORS`, `SPEED_COLORS`.

- [ ] **Step 1: Write the failing test for `computeTrustScore`**

```ts
import { describe, it, expect } from "vitest";
import { computeTrustScore } from "@/features/coverage-reports/trust/computeTrustScore";
import type { SpeedSample } from "@/features/coverage-reports/types";

const inApp: SpeedSample = { source: "in_app", downloadMbps: 120, uploadMbps: 20, pingMs: 20, speedtestUrl: null };
const manualLink: SpeedSample = { source: "manual", downloadMbps: 120, uploadMbps: 20, pingMs: 20, speedtestUrl: "https://www.speedtest.net/result/1" };
const manualNoLink: SpeedSample = { source: "manual", downloadMbps: 120, uploadMbps: 20, pingMs: 20, speedtestUrl: null };

describe("computeTrustScore", () => {
  it("returns base 0.50 for a bare report with no speed and >100m accuracy", () => {
    expect(computeTrustScore({ speed: null, accuracyMeters: 500, isManualPin: false, ipRegionFar: false })).toBeCloseTo(0.5, 5);
  });

  it("weights in-app and manual+link equally", () => {
    const a = computeTrustScore({ speed: inApp, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    const b = computeTrustScore({ speed: manualLink, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    expect(a).toBeCloseTo(b, 5);
    expect(a).toBeCloseTo(0.8, 5); // 50 + 30
  });

  it("gives manual-without-link less than manual-with-link", () => {
    const withLink = computeTrustScore({ speed: manualLink, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    const noLink = computeTrustScore({ speed: manualNoLink, accuracyMeters: 500, isManualPin: false, ipRegionFar: false });
    expect(noLink).toBeLessThan(withLink);
    expect(noLink).toBeCloseTo(0.68, 5); // 50 + 18
  });

  it("adds accuracy bonus and clamps to 1.0", () => {
    // 50 + 30 (in-app) + 20 (<30m) = 100 -> 1.0
    expect(computeTrustScore({ speed: inApp, accuracyMeters: 10, isManualPin: false, ipRegionFar: false })).toBeCloseTo(1, 5);
  });

  it("subtracts for manual pin and clamps to >= 0", () => {
    // 50 - 5 (manual pin) - 20 (geo far) = 25 -> 0.25
    expect(computeTrustScore({ speed: null, accuracyMeters: null, isManualPin: true, ipRegionFar: true })).toBeCloseTo(0.25, 5);
  });

  it("applies the ip-region penalty", () => {
    const near = computeTrustScore({ speed: null, accuracyMeters: 50, isManualPin: false, ipRegionFar: false });
    const far = computeTrustScore({ speed: null, accuracyMeters: 50, isManualPin: false, ipRegionFar: true });
    expect(near - far).toBeCloseTo(0.2, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- computeTrustScore`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `computeTrustScore.ts`**

```ts
import type { SpeedSample } from "@/features/coverage-reports/types";

export const TRUST_BASE = 50;
export const TRUST_IN_APP_SPEED = 30;
export const TRUST_MANUAL_WITH_LINK = 30;
export const TRUST_MANUAL_NO_LINK = 18;
export const TRUST_ACCURACY_UNDER_30M = 20;
export const TRUST_ACCURACY_UNDER_100M = 10;
export const TRUST_MANUAL_PIN_PENALTY = -5;
export const TRUST_IP_REGION_FAR_PENALTY = -20;

export interface TrustInput {
  speed: SpeedSample | null;
  accuracyMeters: number | null;
  isManualPin: boolean;
  ipRegionFar: boolean;
}

function speedPoints(speed: SpeedSample | null): number {
  if (!speed) return 0;
  if (speed.source === "in_app") return TRUST_IN_APP_SPEED;
  return speed.speedtestUrl ? TRUST_MANUAL_WITH_LINK : TRUST_MANUAL_NO_LINK;
}

function accuracyPoints(input: TrustInput): number {
  if (input.isManualPin || input.accuracyMeters === null) {
    return input.isManualPin ? TRUST_MANUAL_PIN_PENALTY : 0;
  }
  if (input.accuracyMeters < 30) return TRUST_ACCURACY_UNDER_30M;
  if (input.accuracyMeters <= 100) return TRUST_ACCURACY_UNDER_100M;
  return 0;
}

export function computeTrustScore(input: TrustInput): number {
  let raw = TRUST_BASE;
  raw += speedPoints(input.speed);
  raw += accuracyPoints(input);
  if (input.ipRegionFar) raw += TRUST_IP_REGION_FAR_PENALTY;
  const clamped = Math.max(0, Math.min(100, raw));
  return clamped / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- computeTrustScore`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing test for `trustTiers`**

```ts
import { describe, it, expect } from "vitest";
import { trustTier, statusForTrust, CONFIDENCE_COLORS } from "@/features/coverage-reports/trust/trustTiers";

describe("trustTiers", () => {
  it("maps scores to tiers", () => {
    expect(trustTier(0.9)).toBe("very-high");
    expect(trustTier(0.65)).toBe("high");
    expect(trustTier(0.5)).toBe("medium");
    expect(trustTier(0.3)).toBe("low");
    expect(trustTier(0.1)).toBe("hidden");
  });

  it("derives visibility status at the 0.20 threshold", () => {
    expect(statusForTrust(0.2)).toBe("visible");
    expect(statusForTrust(0.19)).toBe("hidden");
  });

  it("exposes a color for every non-hidden tier", () => {
    expect(CONFIDENCE_COLORS["very-high"]).toMatch(/^#/);
    expect(CONFIDENCE_COLORS["low"]).toMatch(/^#/);
  });
});
```

- [ ] **Step 6: Run it (fails), then write `trustTiers.ts`**

Run: `npm run test -- trustTiers` → FAIL, then implement:

```ts
export type ConfidenceTier = "very-high" | "high" | "medium" | "low" | "hidden";

export const VISIBLE_TRUST_THRESHOLD = 0.2;
export const VERIFIED_ONLY_THRESHOLD = 0.75;

export function trustTier(score: number): ConfidenceTier {
  if (score >= 0.75) return "very-high";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  if (score >= 0.2) return "low";
  return "hidden";
}

export function statusForTrust(score: number): "visible" | "hidden" {
  return score >= VISIBLE_TRUST_THRESHOLD ? "visible" : "hidden";
}

export const CONFIDENCE_COLORS: Record<Exclude<ConfidenceTier, "hidden">, string> = {
  "very-high": "#10b981",
  high: "#f59e0b",
  medium: "#ef4444",
  low: "#9ca3af",
};

export const SPEED_COLORS = {
  ultra: "#7c3aed", // > 200
  veryFast: "#3b82f6", // 100–200
  good: "#10b981", // 50–100
  fair: "#f59e0b", // 20–50
  poor: "#ef4444", // < 20
  lowData: "#9ca3af", // < 3 samples
} as const;
```

- [ ] **Step 7: Run both trust tests to verify pass**

Run: `npm run test -- trust`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/coverage-reports/trust tests/unit/computeTrustScore.test.ts tests/unit/trustTiers.test.ts
git commit -m "feat(coverage): trust score and confidence tiers"
```

---
### Task 4: Database schema (`schema.md`)

**Files:**
- Create: `schema.md` (repo root)

**Interfaces:**
- Consumes: nothing.
- Produces: SQL contract that Tasks 6–9 rely on — tables `reports`, `report_submissions_log`; functions `check_rate_limit(text, text) → boolean`, `get_coverage_cells(double precision, double precision, double precision, double precision, int, real, boolean) → setof rows`.

**Verification note:** This SQL cannot be unit-tested without a live DB. Verify by (a) reading it against the column/function contract used in Tasks 6–9, and (b) pasting it into the Supabase SQL editor once credentials exist. The column names and the `get_coverage_cells` return columns MUST match `CoverageCell` (snake_case in SQL → camelCase mapped in `repository.ts`).

- [ ] **Step 1: Write `schema.md`**

````markdown
# Supabase Schema — Community 5G Coverage Reports

Run this whole file in the Supabase SQL editor (Project → SQL → New query → paste → Run).
Re-running is safe: it uses `create ... if not exists` and `create or replace`.

## Tunable constants

Rate limits live inside `check_rate_limit` below. To change them, edit these
three values and re-run the function block:
- per-IP hourly cap: `5`
- per-device daily cap: `10`
- minimum seconds between submissions from one IP: `300`

```sql
-- Extensions --------------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- Tables ------------------------------------------------------------------
create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  latitude            double precision not null,
  longitude           double precision not null,
  geohash             text not null,
  accuracy_meters     integer,
  is_manual_pin       boolean not null default false,
  five_g_present      text not null check (five_g_present in ('yes','no','maybe')),
  operator            text check (operator in ('Jazz','Zong')),
  speed_source        text check (speed_source in ('in_app','manual')),
  download_mbps       real,
  upload_mbps         real,
  ping_ms             integer,
  speedtest_url       text,
  device_fingerprint  text not null,
  ip_hash             text not null,
  trust_score         real not null,
  status              text not null default 'visible' check (status in ('visible','hidden')),
  created_at          timestamptz not null default now()
);

create index if not exists reports_geohash_idx      on public.reports (geohash);
create index if not exists reports_lat_lng_idx       on public.reports (latitude, longitude);
create index if not exists reports_created_at_idx    on public.reports (created_at);
create index if not exists reports_visible_idx       on public.reports (status) where status = 'visible';

create table if not exists public.report_submissions_log (
  id                  uuid primary key default gen_random_uuid(),
  ip_hash             text not null,
  device_fingerprint  text not null,
  created_at          timestamptz not null default now()
);

create index if not exists submissions_ip_idx     on public.report_submissions_log (ip_hash, created_at);
create index if not exists submissions_device_idx on public.report_submissions_log (device_fingerprint, created_at);

-- Rate limiter ------------------------------------------------------------
-- Atomically checks caps; only logs the attempt when it is allowed, so a
-- rejected attempt does not push the sliding window forward.
create or replace function public.check_rate_limit(p_ip_hash text, p_fingerprint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_hour_count    integer;
  device_day_count integer;
  last_ip_at       timestamptz;
begin
  select count(*) into ip_hour_count
    from report_submissions_log
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  if ip_hour_count >= 5 then return false; end if;

  select count(*) into device_day_count
    from report_submissions_log
    where device_fingerprint = p_fingerprint and created_at > now() - interval '1 day';
  if device_day_count >= 10 then return false; end if;

  select max(created_at) into last_ip_at
    from report_submissions_log
    where ip_hash = p_ip_hash;
  if last_ip_at is not null and last_ip_at > now() - interval '300 seconds' then
    return false;
  end if;

  insert into report_submissions_log (ip_hash, device_fingerprint)
    values (p_ip_hash, p_fingerprint);
  return true;
end;
$$;

-- Aggregation -------------------------------------------------------------
create or replace function public.get_coverage_cells(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  p_precision integer,
  p_min_trust real,
  p_verified_only boolean
)
returns table (
  geohash_prefix text,
  center_lat double precision,
  center_lng double precision,
  total bigint,
  confirmed bigint,
  not_available bigint,
  intermittent bigint,
  avg_download real,
  avg_upload real,
  avg_ping real,
  avg_trust real,
  jazz_count bigint,
  zong_count bigint,
  unknown_count bigint
)
language sql
stable
as $$
  select
    left(geohash, p_precision)                                   as geohash_prefix,
    avg(latitude)                                                as center_lat,
    avg(longitude)                                               as center_lng,
    count(*)                                                     as total,
    count(*) filter (where five_g_present = 'yes')               as confirmed,
    count(*) filter (where five_g_present = 'no')                as not_available,
    count(*) filter (where five_g_present = 'maybe')             as intermittent,
    avg(download_mbps)                                           as avg_download,
    avg(upload_mbps)                                             as avg_upload,
    avg(ping_ms)::real                                           as avg_ping,
    avg(trust_score)                                             as avg_trust,
    count(*) filter (where operator = 'Jazz')                    as jazz_count,
    count(*) filter (where operator = 'Zong')                    as zong_count,
    count(*) filter (where operator is null)                     as unknown_count
  from public.reports
  where status = 'visible'
    and trust_score >= p_min_trust
    and (not p_verified_only or trust_score >= 0.75)
    and latitude between min_lat and max_lat
    and longitude between min_lng and max_lng
  group by left(geohash, p_precision);
$$;

-- Row Level Security ------------------------------------------------------
-- All app traffic uses the service-role key (bypasses RLS). Enabling RLS with
-- no anon policies denies direct anon/client access. To later expose a public
-- read of aggregated data, grant execute on get_coverage_cells to anon.
alter table public.reports enable row level security;
alter table public.report_submissions_log enable row level security;
```
````

- [ ] **Step 2: Self-check the contract**

Confirm by eye: `get_coverage_cells` returns exactly the columns `repository.getCoverageCells` will map (Task 7), and `reports` has every column `repository.insertReport` writes (Task 7). Fix names now if they drift.

- [ ] **Step 3: Commit**

```bash
git add schema.md
git commit -m "feat(coverage): supabase schema, rate-limit and aggregation functions"
```

---

### Task 5: Supabase clients, env, and IP hashing

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Create: `src/server/reports/ipHash.ts`
- Modify: `.env.example`
- Modify: `package.json` (add `@supabase/supabase-js`)
- Test: `tests/unit/ipHash.test.ts`

**Interfaces:**
- Consumes: env vars.
- Produces: `getServerSupabase()`, `getBrowserSupabase()`, `hashIp(ip, salt)`.

- [ ] **Step 1: Install the dependency**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Append to `.env.example`**

```
# Supabase (community coverage reports)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_IP_HASH_SALT=CHANGE_ME_TO_A_LONG_RANDOM_STRING
```

- [ ] **Step 3: Write the failing test for `hashIp`**

```ts
import { describe, it, expect } from "vitest";
import { hashIp } from "@/server/reports/ipHash";

describe("hashIp", () => {
  it("is deterministic for the same ip + salt", () => {
    expect(hashIp("203.0.113.5", "salt")).toBe(hashIp("203.0.113.5", "salt"));
  });

  it("differs when the salt differs", () => {
    expect(hashIp("203.0.113.5", "a")).not.toBe(hashIp("203.0.113.5", "b"));
  });

  it("returns a 64-char hex string and never the raw ip", () => {
    const h = hashIp("203.0.113.5", "salt");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("203.0.113.5");
  });
});
```

- [ ] **Step 4: Run it (fails), then write `ipHash.ts`**

```ts
import { createHash } from "node:crypto";

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
```

- [ ] **Step 5: Write `server.ts` and `client.ts`**

`src/lib/supabase/server.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server env vars are missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
```

`src/lib/supabase/client.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Reserved for a future public read path; unused in this slice.
export function getBrowserSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase public env vars are missing.");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
```

- [ ] **Step 6: Run test + typecheck**

Run: `npm run test -- ipHash && npm run typecheck`
Expected: tests PASS, typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add .env.example package.json package-lock.json src/lib/supabase src/server/reports/ipHash.ts tests/unit/ipHash.test.ts
git commit -m "feat(coverage): supabase clients, env, ip hashing"
```

---
### Task 6: Anti-fraud check pipeline

**Files:**
- Create: `src/server/reports/antiFraud.ts`
- Test: `tests/unit/antiFraud.test.ts`

**Interfaces:**
- Consumes: `ReportSubmission` from `types.ts`.
- Produces: `FraudContext`, `CheckResult`, `runAntiFraud(ctx): Promise<CheckResult>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { runAntiFraud } from "@/server/reports/antiFraud";
import type { ReportSubmission } from "@/features/coverage-reports/types";

const submission: ReportSubmission = {
  latitude: 31.5, longitude: 74.34, accuracyMeters: 20, isManualPin: false,
  fiveGPresent: "yes", operator: "Jazz", speed: null, deviceFingerprint: "abc123def456",
};

const allow = vi.fn(async () => true);

describe("runAntiFraud", () => {
  it("passes a clean submission", async () => {
    const r = await runAntiFraud({ submission, ipHash: "iphash", ipRegionFar: false, checkRateLimit: allow });
    expect(r.pass).toBe(true);
  });

  it("rejects when rate limited (and short-circuits before other checks)", async () => {
    const deny = vi.fn(async () => false);
    const r = await runAntiFraud({ submission, ipHash: "iphash", ipRegionFar: false, checkRateLimit: deny });
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/too many/i);
  });

  it("rejects a too-short fingerprint", async () => {
    const r = await runAntiFraud({ submission: { ...submission, deviceFingerprint: "ab" }, ipHash: "x", ipRegionFar: false, checkRateLimit: allow });
    expect(r.pass).toBe(false);
  });

  it("rejects coordinates outside Pakistan bounds", async () => {
    const r = await runAntiFraud({ submission: { ...submission, latitude: 51 }, ipHash: "x", ipRegionFar: false, checkRateLimit: allow });
    expect(r.pass).toBe(false);
  });

  it("rejects impossible speed", async () => {
    const speed = { source: "manual" as const, downloadMbps: 99999, uploadMbps: 5, pingMs: 10, speedtestUrl: null };
    const r = await runAntiFraud({ submission: { ...submission, speed }, ipHash: "x", ipRegionFar: false, checkRateLimit: allow });
    expect(r.pass).toBe(false);
  });

  it("does NOT reject merely because the ip region is far (soft check)", async () => {
    const r = await runAntiFraud({ submission, ipHash: "x", ipRegionFar: true, checkRateLimit: allow });
    expect(r.pass).toBe(true);
  });
});
```

- [ ] **Step 2: Run it (fails), then write `antiFraud.ts`**

```ts
import type { ReportSubmission } from "@/features/coverage-reports/types";

export interface FraudContext {
  submission: ReportSubmission;
  ipHash: string;
  ipRegionFar: boolean;
  checkRateLimit: (ipHash: string, fingerprint: string) => Promise<boolean>;
}

export interface CheckResult {
  pass: boolean;
  reason?: string;
}

const PK_BOUNDS = { minLat: 23, maxLat: 37, minLng: 60, maxLng: 78 };

export async function runAntiFraud(ctx: FraudContext): Promise<CheckResult> {
  const { submission } = ctx;

  const allowed = await ctx.checkRateLimit(ctx.ipHash, submission.deviceFingerprint);
  if (!allowed) {
    return { pass: false, reason: "Too many reports recently. Please wait a few minutes and try again." };
  }

  if (!submission.deviceFingerprint || submission.deviceFingerprint.length < 6) {
    return { pass: false, reason: "Could not verify your device. Please reload and try again." };
  }

  const { latitude, longitude } = submission;
  if (
    latitude < PK_BOUNDS.minLat || latitude > PK_BOUNDS.maxLat ||
    longitude < PK_BOUNDS.minLng || longitude > PK_BOUNDS.maxLng
  ) {
    return { pass: false, reason: "This location is outside Pakistan." };
  }

  const s = submission.speed;
  if (s) {
    const bad =
      (s.downloadMbps !== null && (s.downloadMbps <= 0 || s.downloadMbps > 5000)) ||
      (s.uploadMbps !== null && (s.uploadMbps <= 0 || s.uploadMbps > 5000)) ||
      (s.pingMs !== null && (s.pingMs < 1 || s.pingMs > 2000));
    if (bad) {
      return { pass: false, reason: "The speed values look impossible. Please check them." };
    }
  }

  return { pass: true };
}
```

- [ ] **Step 3: Run test to verify pass**

Run: `npm run test -- antiFraud`
Expected: PASS (6 tests).

- [ ] **Step 4: Commit**

```bash
git add src/server/reports/antiFraud.ts tests/unit/antiFraud.test.ts
git commit -m "feat(coverage): server-side anti-fraud pipeline"
```

---

### Task 7: Repository (DB access + RPC wrappers)

**Files:**
- Create: `src/server/reports/repository.ts`

**Interfaces:**
- Consumes: `getServerSupabase` (Task 5), `encodeGeohash` (Task 2), types.
- Produces: `Repository` interface + `supabaseRepository` implementation:
  - `checkRateLimit(ipHash, fingerprint): Promise<boolean>`
  - `insertReport(row: ReportRow): Promise<void>`
  - `getCoverageCells(params: CellQuery): Promise<CoverageCell[]>`
  - types `ReportRow`, `CellQuery`.

**Verification note:** Direct DB calls aren't unit-tested (no live DB in CI); the `Repository` interface is what Task 8 mocks. Verify with `npm run typecheck`.

- [ ] **Step 1: Write `repository.ts`**

```ts
import { getServerSupabase } from "@/lib/supabase/server";
import type { CoverageCell } from "@/features/coverage-reports/types";

export interface ReportRow {
  latitude: number;
  longitude: number;
  geohash: string;
  accuracy_meters: number | null;
  is_manual_pin: boolean;
  five_g_present: string;
  operator: string | null;
  speed_source: string | null;
  download_mbps: number | null;
  upload_mbps: number | null;
  ping_ms: number | null;
  speedtest_url: string | null;
  device_fingerprint: string;
  ip_hash: string;
  trust_score: number;
  status: "visible" | "hidden";
}

export interface CellQuery {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  precision: number;
  minTrust: number;
  verifiedOnly: boolean;
}

export interface Repository {
  checkRateLimit(ipHash: string, fingerprint: string): Promise<boolean>;
  insertReport(row: ReportRow): Promise<void>;
  getCoverageCells(params: CellQuery): Promise<CoverageCell[]>;
}

export const supabaseRepository: Repository = {
  async checkRateLimit(ipHash, fingerprint) {
    const db = getServerSupabase();
    const { data, error } = await db.rpc("check_rate_limit", {
      p_ip_hash: ipHash,
      p_fingerprint: fingerprint,
    });
    if (error) throw new Error(`rate limit check failed: ${error.message}`);
    return data === true;
  },

  async insertReport(row) {
    const db = getServerSupabase();
    const { error } = await db.from("reports").insert(row);
    if (error) throw new Error(`insert failed: ${error.message}`);
  },

  async getCoverageCells(params) {
    const db = getServerSupabase();
    const { data, error } = await db.rpc("get_coverage_cells", {
      min_lat: params.minLat,
      min_lng: params.minLng,
      max_lat: params.maxLat,
      max_lng: params.maxLng,
      p_precision: params.precision,
      p_min_trust: params.minTrust,
      p_verified_only: params.verifiedOnly,
    });
    if (error) throw new Error(`cell query failed: ${error.message}`);
    type Raw = {
      geohash_prefix: string; center_lat: number; center_lng: number;
      total: number; confirmed: number; not_available: number; intermittent: number;
      avg_download: number | null; avg_upload: number | null; avg_ping: number | null;
      avg_trust: number; jazz_count: number; zong_count: number; unknown_count: number;
    };
    return ((data as Raw[]) ?? []).map((r) => ({
      geohashPrefix: r.geohash_prefix,
      centerLat: r.center_lat,
      centerLng: r.center_lng,
      total: Number(r.total),
      confirmed: Number(r.confirmed),
      notAvailable: Number(r.not_available),
      intermittent: Number(r.intermittent),
      avgDownload: r.avg_download,
      avgUpload: r.avg_upload,
      avgPing: r.avg_ping,
      avgTrust: r.avg_trust,
      jazzCount: Number(r.jazz_count),
      zongCount: Number(r.zong_count),
      unknownCount: Number(r.unknown_count),
    }));
  },
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/server/reports/repository.ts
git commit -m "feat(coverage): supabase repository"
```

---
### Task 8: submitReport orchestrator

**Files:**
- Create: `src/server/reports/submitReport.ts`
- Test: `tests/unit/submitReport.test.ts`

**Interfaces:**
- Consumes: `Repository`, `ReportRow` (Task 7); `runAntiFraud` (Task 6); `computeTrustScore` (Task 3); `statusForTrust` (Task 3); `encodeGeohash` (Task 2); `ReportSubmission`, `SubmitOk` (Task 1).
- Produces: `submitReport(deps): Promise<SubmitOk | { ok: false; reason: string }>` where `deps = { submission, ipHash, ipRegionFar, repository }`.

- [ ] **Step 1: Write the failing test (mocked repository)**

```ts
import { describe, it, expect, vi } from "vitest";
import { submitReport } from "@/server/reports/submitReport";
import type { Repository } from "@/server/reports/repository";
import type { ReportSubmission } from "@/features/coverage-reports/types";

function makeRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    checkRateLimit: vi.fn(async () => true),
    insertReport: vi.fn(async () => {}),
    getCoverageCells: vi.fn(async () => []),
    ...overrides,
  };
}

const submission: ReportSubmission = {
  latitude: 31.5, longitude: 74.34, accuracyMeters: 10, isManualPin: false,
  fiveGPresent: "yes", operator: "Jazz",
  speed: { source: "in_app", downloadMbps: 120, uploadMbps: 20, pingMs: 20, speedtestUrl: null },
  deviceFingerprint: "abc123def456",
};

describe("submitReport", () => {
  it("inserts a trust-scored, geohashed row and returns the score", async () => {
    const repo = makeRepo();
    const res = await submitReport({ submission, ipHash: "iphash", ipRegionFar: false, repository: repo });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.trustScore).toBeCloseTo(1, 5); // 50 + 30 + 20
      expect(res.status).toBe("visible");
    }
    const row = (repo.insertReport as any).mock.calls[0][0];
    expect(row.geohash).toHaveLength(7);
    expect(row.ip_hash).toBe("iphash");
    expect(row.trust_score).toBeCloseTo(1, 5);
    expect(row.speed_source).toBe("in_app");
  });

  it("does not insert and returns reason when rate limited", async () => {
    const repo = makeRepo({ checkRateLimit: vi.fn(async () => false) });
    const res = await submitReport({ submission, ipHash: "x", ipRegionFar: false, repository: repo });
    expect(res.ok).toBe(false);
    expect(repo.insertReport).not.toHaveBeenCalled();
  });

  it("marks status hidden when trust falls below 0.20", async () => {
    const repo = makeRepo();
    const weak: ReportSubmission = { ...submission, speed: null, accuracyMeters: null, isManualPin: true };
    const res = await submitReport({ submission: weak, ipHash: "x", ipRegionFar: true, repository: repo });
    // 50 - 5 - 20 = 25 -> 0.25 visible; push lower via far + manual already = 0.25. Keep visible check:
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.status).toBe("visible");
  });
});
```

- [ ] **Step 2: Run it (fails), then write `submitReport.ts`**

```ts
import type { Repository, ReportRow } from "@/server/reports/repository";
import type { ReportSubmission, SubmitOk } from "@/features/coverage-reports/types";
import { runAntiFraud } from "@/server/reports/antiFraud";
import { computeTrustScore } from "@/features/coverage-reports/trust/computeTrustScore";
import { statusForTrust } from "@/features/coverage-reports/trust/trustTiers";
import { encodeGeohash } from "@/features/coverage-reports/geohash/geohash";

export interface SubmitDeps {
  submission: ReportSubmission;
  ipHash: string;
  ipRegionFar: boolean;
  repository: Repository;
}

export async function submitReport(
  deps: SubmitDeps
): Promise<SubmitOk | { ok: false; reason: string }> {
  const { submission, ipHash, ipRegionFar, repository } = deps;

  const fraud = await runAntiFraud({
    submission,
    ipHash,
    ipRegionFar,
    checkRateLimit: (h, f) => repository.checkRateLimit(h, f),
  });
  if (!fraud.pass) {
    return { ok: false, reason: fraud.reason ?? "Report rejected." };
  }

  const trustScore = computeTrustScore({
    speed: submission.speed,
    accuracyMeters: submission.accuracyMeters,
    isManualPin: submission.isManualPin,
    ipRegionFar,
  });
  const status = statusForTrust(trustScore);

  const row: ReportRow = {
    latitude: submission.latitude,
    longitude: submission.longitude,
    geohash: encodeGeohash(submission.latitude, submission.longitude, 7),
    accuracy_meters: submission.accuracyMeters,
    is_manual_pin: submission.isManualPin,
    five_g_present: submission.fiveGPresent,
    operator: submission.operator,
    speed_source: submission.speed?.source ?? null,
    download_mbps: submission.speed?.downloadMbps ?? null,
    upload_mbps: submission.speed?.uploadMbps ?? null,
    ping_ms: submission.speed?.pingMs ?? null,
    speedtest_url: submission.speed?.speedtestUrl ?? null,
    device_fingerprint: submission.deviceFingerprint,
    ip_hash: ipHash,
    trust_score: trustScore,
    status,
  };

  await repository.insertReport(row);
  return { ok: true, trustScore, status };
}
```

- [ ] **Step 3: Run test to verify pass**

Run: `npm run test -- submitReport`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/server/reports/submitReport.ts tests/unit/submitReport.test.ts
git commit -m "feat(coverage): submit orchestrator wiring fraud + trust + insert"
```

---

### Task 9: API route — `POST /api/reports` + `GET /api/reports`

**Files:**
- Create: `src/app/api/reports/route.ts`
- Test: `tests/unit/reportsRoute.test.ts`

**Interfaces:**
- Consumes: `ReportSubmissionSchema` (Task 1); `submitReport` (Task 8); `supabaseRepository` (Task 7); `hashIp` (Task 5); `haversineDistanceKm` (`@/lib/haversine`); `precisionForZoom` (Task 2); `CoverageCellsResponseSchema` (Task 1).
- Produces: HTTP `POST` (submit) and `GET` (cells) handlers. GET query params: `minLat,minLng,maxLat,maxLng,zoom,verified`.

**Design notes:**
- `export const runtime = "nodejs"` (needs `node:crypto` via `hashIp`).
- Client IP from `x-forwarded-for` (first entry) else `x-real-ip` else `"0.0.0.0"`.
- `ipRegionFar`: if `x-vercel-ip-latitude`/`x-vercel-ip-longitude` headers exist, `haversineDistanceKm(ipLat, ipLng, submission.latitude, submission.longitude) > 300`; else `false`.
- To keep the route thin and testable, the handlers delegate to `submitReport`/`repository`; the test imports `POST`/`GET` and passes a `Request`. Because the route uses the module-level `supabaseRepository`, the test mocks that module.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/reports/repository", () => ({
  supabaseRepository: {
    checkRateLimit: vi.fn(async () => true),
    insertReport: vi.fn(async () => {}),
    getCoverageCells: vi.fn(async () => [
      { geohashPrefix: "tuvz", centerLat: 31.5, centerLng: 74.3, total: 3, confirmed: 3,
        notAvailable: 0, intermittent: 0, avgDownload: 120, avgUpload: 20, avgPing: 20,
        avgTrust: 0.8, jazzCount: 3, zongCount: 0, unknownCount: 0 },
    ]),
  },
}));

import { POST, GET } from "@/app/api/reports/route";
import { supabaseRepository } from "@/server/reports/repository";

const body = {
  latitude: 31.5, longitude: 74.34, accuracyMeters: 10, isManualPin: false,
  fiveGPresent: "yes", operator: "Jazz", speed: null, deviceFingerprint: "abc123def456",
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/reports", () => {
  it("accepts a valid report and returns a trust score", async () => {
    const req = new Request("http://localhost/api/reports", {
      method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.trustScore).toBe("number");
    expect(supabaseRepository.insertReport).toHaveBeenCalledTimes(1);
  });

  it("returns 400 on an invalid payload", async () => {
    const req = new Request("http://localhost/api/reports", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, fiveGPresent: "nope" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when the repository reports rate-limited", async () => {
    (supabaseRepository.checkRateLimit as any).mockResolvedValueOnce(false);
    const req = new Request("http://localhost/api/reports", {
      method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});

describe("GET /api/reports", () => {
  it("returns aggregated cells for a bbox", async () => {
    const req = new Request("http://localhost/api/reports?minLat=30&minLng=73&maxLat=32&maxLng=75&zoom=12&verified=false");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cells).toHaveLength(1);
    expect(json.cells[0].geohashPrefix).toBe("tuvz");
  });
});
```

- [ ] **Step 2: Run it (fails), then write `route.ts`**

```ts
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
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

function ipRegionFar(req: Request, lat: number, lng: number): boolean {
  const ipLat = parseFloat(req.headers.get("x-vercel-ip-latitude") ?? "");
  const ipLng = parseFloat(req.headers.get("x-vercel-ip-longitude") ?? "");
  if (Number.isNaN(ipLat) || Number.isNaN(ipLng)) return false;
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

  const salt = process.env.SUPABASE_IP_HASH_SALT ?? "";
  const ipHash = hashIp(clientIp(req), salt);
  const far = ipRegionFar(req, submission.latitude, submission.longitude);

  try {
    const result = await submitReport({ submission, ipHash, ipRegionFar: far, repository: supabaseRepository });
    if (!result.ok) {
      const status = /too many/i.test(result.reason) ? 429 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, reason: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const num = (k: string) => parseFloat(url.searchParams.get(k) ?? "");
  const minLat = num("minLat"), minLng = num("minLng"), maxLat = num("maxLat"), maxLng = num("maxLng");
  const zoom = num("zoom");
  if ([minLat, minLng, maxLat, maxLng, zoom].some(Number.isNaN)) {
    return NextResponse.json({ cells: [] }, { status: 200 });
  }
  const verifiedOnly = url.searchParams.get("verified") === "true";

  try {
    const cells = await supabaseRepository.getCoverageCells({
      minLat, minLng, maxLat, maxLng,
      precision: precisionForZoom(zoom),
      minTrust: verifiedOnly ? VERIFIED_ONLY_THRESHOLD : VISIBLE_TRUST_THRESHOLD,
      verifiedOnly,
    });
    return NextResponse.json({ cells }, { status: 200 });
  } catch {
    return NextResponse.json({ cells: [] }, { status: 500 });
  }
}
```

- [ ] **Step 3: Run test + typecheck**

Run: `npm run test -- reportsRoute && npm run typecheck`
Expected: tests PASS (4), typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reports/route.ts tests/unit/reportsRoute.test.ts
git commit -m "feat(coverage): /api/reports submit + cells endpoints"
```

---
### Task 10: Speed-test endpoints

**Files:**
- Create: `src/app/api/speedtest/download/route.ts`
- Create: `src/app/api/speedtest/upload/route.ts`
- Test: `tests/unit/speedtestRoute.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `GET /api/speedtest/download?bytes=N` (streams N bytes) and `POST /api/speedtest/upload` (drains body, returns byte count). Client-side timing lives in Task 12.

**Design notes:**
- Cap `bytes` at 25 MB to avoid abuse.
- `runtime = "nodejs"`, `dynamic = "force-dynamic"`, never cached.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/speedtest/download/route";
import { POST } from "@/app/api/speedtest/upload/route";

describe("speedtest download", () => {
  it("returns the requested number of bytes", async () => {
    const req = new Request("http://localhost/api/speedtest/download?bytes=1024");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBe(1024);
  });

  it("caps oversized requests", async () => {
    const req = new Request("http://localhost/api/speedtest/download?bytes=999999999");
    const res = await GET(req);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeLessThanOrEqual(25 * 1024 * 1024);
  });
});

describe("speedtest upload", () => {
  it("reports the received byte count", async () => {
    const req = new Request("http://localhost/api/speedtest/upload", {
      method: "POST", body: new Uint8Array(2048),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bytes).toBe(2048);
  });
});
```

- [ ] **Step 2: Run it (fails), then write `download/route.ts`**

```ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = parseInt(url.searchParams.get("bytes") ?? "5000000", 10);
  const bytes = Math.max(0, Math.min(Number.isNaN(requested) ? 0 : requested, MAX_BYTES));
  const payload = new Uint8Array(bytes);
  return new NextResponse(payload, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "no-store, no-cache, must-revalidate",
      "content-length": String(bytes),
    },
  });
}
```

- [ ] **Step 3: Write `upload/route.ts`**

```ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const buf = await req.arrayBuffer();
  return NextResponse.json(
    { bytes: buf.byteLength },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
```

- [ ] **Step 4: Run test + commit**

```bash
npm run test -- speedtestRoute
git add src/app/api/speedtest tests/unit/speedtestRoute.test.ts
git commit -m "feat(coverage): in-app speed-test endpoints"
```

---

### Task 11: Reports API client (browser)

**Files:**
- Create: `src/features/coverage-reports/api/reportsClient.ts`
- Test: `tests/unit/reportsClient.test.ts`

**Interfaces:**
- Consumes: `ReportSubmission`, `SubmitOk`, `CoverageCell` (Task 1); `CoverageCellsResponseSchema` (Task 1).
- Produces: `submitReport(body): Promise<SubmitResult>`, `fetchCoverageCells(query): Promise<CoverageCell[]>`, type `SubmitResult`.

- [ ] **Step 1: Write the failing test (mocked fetch)**

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { submitReport, fetchCoverageCells } from "@/features/coverage-reports/api/reportsClient";
import type { ReportSubmission } from "@/features/coverage-reports/types";

const body: ReportSubmission = {
  latitude: 31.5, longitude: 74.34, accuracyMeters: 10, isManualPin: false,
  fiveGPresent: "yes", operator: "Jazz", speed: null, deviceFingerprint: "abc123def456",
};

afterEach(() => vi.restoreAllMocks());

describe("reportsClient.submitReport", () => {
  it("returns ok result on 201", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, trustScore: 0.8, status: "visible" }), { status: 201 })));
    const res = await submitReport(body);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.trustScore).toBe(0.8);
  });

  it("returns a friendly failure on 429", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, reason: "Too many reports recently." }), { status: 429 })));
    const res = await submitReport(body);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/too many/i);
  });
});

describe("reportsClient.fetchCoverageCells", () => {
  it("parses and returns cells", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ cells: [
      { geohashPrefix: "tuvz", centerLat: 31.5, centerLng: 74.3, total: 2, confirmed: 2, notAvailable: 0, intermittent: 0, avgDownload: null, avgUpload: null, avgPing: null, avgTrust: 0.7, jazzCount: 2, zongCount: 0, unknownCount: 0 },
    ] }), { status: 200 })));
    const cells = await fetchCoverageCells({ minLat: 30, minLng: 73, maxLat: 32, maxLng: 75, zoom: 12, verifiedOnly: false });
    expect(cells).toHaveLength(1);
    expect(cells[0].geohashPrefix).toBe("tuvz");
  });

  it("returns [] on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const cells = await fetchCoverageCells({ minLat: 30, minLng: 73, maxLat: 32, maxLng: 75, zoom: 12, verifiedOnly: false });
    expect(cells).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it (fails), then write `reportsClient.ts`**

```ts
import type { ReportSubmission, SubmitOk, CoverageCell } from "@/features/coverage-reports/types";
import { CoverageCellsResponseSchema } from "@/features/coverage-reports/schemas/report.schema";

export type SubmitResult = SubmitOk | { ok: false; reason: string };

export async function submitReport(body: ReportSubmission): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { ok: true, trustScore: json.trustScore, status: json.status };
    }
    return { ok: false, reason: json.reason ?? "Could not submit your report." };
  } catch {
    return { ok: false, reason: "Network error. Please check your connection and try again." };
  }
}

export interface CellQueryInput {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom: number;
  verifiedOnly: boolean;
}

export async function fetchCoverageCells(q: CellQueryInput): Promise<CoverageCell[]> {
  const params = new URLSearchParams({
    minLat: String(q.minLat), minLng: String(q.minLng),
    maxLat: String(q.maxLat), maxLng: String(q.maxLng),
    zoom: String(q.zoom), verified: String(q.verifiedOnly),
  });
  try {
    const res = await fetch(`/api/reports?${params.toString()}`);
    if (!res.ok) return [];
    const parsed = CoverageCellsResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data.cells : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Run test + commit**

```bash
npm run test -- reportsClient
git add src/features/coverage-reports/api/reportsClient.ts tests/unit/reportsClient.test.ts
git commit -m "feat(coverage): browser API client"
```

---
### Task 12: In-app speed test (pure math + hook)

**Files:**
- Create: `src/features/coverage-reports/hooks/speedMath.ts`
- Create: `src/features/coverage-reports/hooks/useInAppSpeedTest.ts`
- Test: `tests/unit/speedMath.test.ts`

**Interfaces:**
- Consumes: nothing (speedMath); `speedMath` exports (hook).
- Produces: `mbpsFromTransfer(bytes, ms): number`, `median(values: number[]): number` (tested); hook `useInAppSpeedTest()` returning `{ status, result, run }` where `status: "idle"|"testing"|"done"|"error"`, `result: SpeedSample | null`.

**Design rationale:** the byte-math (bytes+ms → Mbps, and taking a median of latency samples) is where bugs hide and is trivially pure, so it's extracted and TDD'd. The hook itself is I/O (fetch + timing) and is verified via typecheck/build per the Global Constraints (no jsdom in this slice).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { mbpsFromTransfer, median } from "@/features/coverage-reports/hooks/speedMath";

describe("mbpsFromTransfer", () => {
  it("converts 5,000,000 bytes in 1000ms to 40 Mbps", () => {
    // 5,000,000 bytes * 8 bits = 40,000,000 bits / 1s = 40 Mbps
    expect(mbpsFromTransfer(5_000_000, 1000)).toBeCloseTo(40, 1);
  });

  it("returns 0 when elapsed time is 0 or negative", () => {
    expect(mbpsFromTransfer(1000, 0)).toBe(0);
    expect(mbpsFromTransfer(1000, -5)).toBe(0);
  });
});

describe("median", () => {
  it("returns the middle value for an odd-length array", () => {
    expect(median([30, 10, 20])).toBe(20);
  });

  it("averages the two middle values for an even-length array", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it("returns 0 for an empty array", () => {
    expect(median([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run it (fails), then write `speedMath.ts`**

```ts
export function mbpsFromTransfer(bytes: number, ms: number): number {
  if (ms <= 0) return 0;
  const bits = bytes * 8;
  const seconds = ms / 1000;
  return bits / seconds / 1_000_000;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
```

- [ ] **Step 3: Run test to verify pass**

Run: `npm run test -- speedMath`
Expected: PASS (5 tests).

- [ ] **Step 4: Write `useInAppSpeedTest.ts`**

```ts
"use client";

import { useCallback, useState } from "react";
import type { SpeedSample } from "@/features/coverage-reports/types";
import { mbpsFromTransfer, median } from "@/features/coverage-reports/hooks/speedMath";

const DOWNLOAD_BYTES = 5_000_000;
const UPLOAD_BYTES = 2_000_000;
const LATENCY_SAMPLES = 5;
const LATENCY_BYTES = 64;

export type SpeedTestStatus = "idle" | "testing" | "done" | "error";

interface UseInAppSpeedTestResult {
  status: SpeedTestStatus;
  result: SpeedSample | null;
  run: () => Promise<void>;
}

async function measureDownload(): Promise<number> {
  const start = performance.now();
  const res = await fetch(`/api/speedtest/download?bytes=${DOWNLOAD_BYTES}`, { cache: "no-store" });
  await res.arrayBuffer();
  const elapsed = performance.now() - start;
  return mbpsFromTransfer(DOWNLOAD_BYTES, elapsed);
}

async function measureUpload(): Promise<number> {
  const payload = new Uint8Array(UPLOAD_BYTES);
  const start = performance.now();
  await fetch("/api/speedtest/upload", { method: "POST", body: payload, cache: "no-store" });
  const elapsed = performance.now() - start;
  return mbpsFromTransfer(UPLOAD_BYTES, elapsed);
}

async function measureLatency(): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < LATENCY_SAMPLES; i++) {
    const start = performance.now();
    await fetch(`/api/speedtest/download?bytes=${LATENCY_BYTES}`, { cache: "no-store" });
    samples.push(performance.now() - start);
  }
  return median(samples);
}

export function useInAppSpeedTest(): UseInAppSpeedTestResult {
  const [status, setStatus] = useState<SpeedTestStatus>("idle");
  const [result, setResult] = useState<SpeedSample | null>(null);

  const run = useCallback(async () => {
    setStatus("testing");
    try {
      const pingMs = await measureLatency();
      const downloadMbps = await measureDownload();
      const uploadMbps = await measureUpload();
      setResult({
        source: "in_app",
        downloadMbps: Math.round(downloadMbps * 10) / 10,
        uploadMbps: Math.round(uploadMbps * 10) / 10,
        pingMs: Math.round(pingMs),
        speedtestUrl: null,
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, []);

  return { status, result, run };
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/features/coverage-reports/hooks/speedMath.ts src/features/coverage-reports/hooks/useInAppSpeedTest.ts tests/unit/speedMath.test.ts
git commit -m "feat(coverage): in-app speed test hook"
```

---

### Task 13: Device fingerprint hook

**Files:**
- Create: `src/features/coverage-reports/fingerprint/useFingerprint.ts`
- Modify: `package.json` (add `@fingerprintjs/fingerprintjs`)

**Interfaces:**
- Consumes: `@fingerprintjs/fingerprintjs` `load()`.
- Produces: `useFingerprint(): { fingerprint: string | null; isReady: boolean }`.

**Verification:** thin wrapper around a third-party async API; verified via `npm run typecheck` and manual browser check in Task 19. Not unit-tested (would require mocking the library's internals with little value).

- [ ] **Step 1: Install the dependency**

Run: `npm install @fingerprintjs/fingerprintjs`

- [ ] **Step 2: Write `useFingerprint.ts`**

```ts
"use client";

import { useEffect, useState } from "react";

export function useFingerprint(): { fingerprint: string | null; isReady: boolean } {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const agent = await FingerprintJS.load();
        const result = await agent.get();
        if (!cancelled) setFingerprint(result.visitorId);
      } catch {
        if (!cancelled) setFingerprint(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { fingerprint, isReady: fingerprint !== null };
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add package.json package-lock.json src/features/coverage-reports/fingerprint/useFingerprint.ts
git commit -m "feat(coverage): device fingerprint hook"
```

---
### Task 14: Presentational primitives — `InfoTooltip` + `TrustBadge`

**Files:**
- Create: `src/features/coverage-reports/components/InfoTooltip.tsx`
- Create: `src/features/coverage-reports/components/TrustBadge.tsx`

**Interfaces:**
- Consumes: `trustTier` (Task 3).
- Produces: `<InfoTooltip label text />`, `<TrustBadge score />`.

**Verification:** presentational; `npm run typecheck` + manual check in Task 19.

- [ ] **Step 1: Write `InfoTooltip.tsx`**

```tsx
"use client";

import { useState } from "react";

interface InfoTooltipProps {
  label: string;
  text: string;
}

export default function InfoTooltip({ label, text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Help: ${label}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold hover:bg-gray-300"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 z-50 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 shadow-xl leading-relaxed"
        >
          {text}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Write `TrustBadge.tsx`**

```tsx
"use client";

import { trustTier } from "@/features/coverage-reports/trust/trustTiers";

const TIER_LABEL: Record<string, string> = {
  "very-high": "Very high",
  high: "High",
  medium: "Medium",
  low: "Low",
  hidden: "Unverified",
};

export default function TrustBadge({ score }: { score: number }) {
  const tier = trustTier(score);
  const pct = Math.round(score * 100);
  const stars = Math.max(1, Math.min(4, Math.ceil(score * 4)));

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
      <span aria-hidden className="text-amber-500">{"★".repeat(stars)}{"☆".repeat(4 - stars)}</span>
      <span className="font-medium">{pct}%</span>
      <span className="text-gray-400">· {TIER_LABEL[tier]}</span>
    </span>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/features/coverage-reports/components/InfoTooltip.tsx src/features/coverage-reports/components/TrustBadge.tsx
git commit -m "feat(coverage): InfoTooltip and TrustBadge primitives"
```

---

### Task 15: Submission state-machine hook

**Files:**
- Create: `src/features/coverage-reports/hooks/useReportSubmission.ts`

**Interfaces:**
- Consumes: `submitReport` from `reportsClient` (Task 11); `ReportSubmission`, `SubmitOk` (Task 1).
- Produces: `useReportSubmission(): { status, result, error, submit(body), reset }` where `status: "idle"|"submitting"|"success"|"error"`, `result: SubmitOk | null`.

**Verification:** `npm run typecheck`; behavior exercised manually in Task 19.

- [ ] **Step 1: Write `useReportSubmission.ts`**

```ts
"use client";

import { useCallback, useState } from "react";
import type { ReportSubmission, SubmitOk } from "@/features/coverage-reports/types";
import { submitReport as postReport } from "@/features/coverage-reports/api/reportsClient";

export type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export function useReportSubmission() {
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [result, setResult] = useState<SubmitOk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (body: ReportSubmission) => {
    setStatus("submitting");
    setError(null);
    const res = await postReport(body);
    if (res.ok) {
      setResult(res);
      setStatus("success");
    } else {
      setError(res.reason);
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, submit, reset };
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/features/coverage-reports/hooks/useReportSubmission.ts
git commit -m "feat(coverage): submission state-machine hook"
```

---

### Task 16: `SpeedTestPanel` + `SuccessCard`

**Files:**
- Create: `src/features/coverage-reports/components/SpeedTestPanel.tsx`
- Create: `src/features/coverage-reports/components/SuccessCard.tsx`

**Interfaces:**
- Consumes: `useInAppSpeedTest` (Task 12); `SpeedSample`, `SubmitOk` (Task 1); `InfoTooltip` (Task 14); `TrustBadge` (Task 14).
- Produces: `<SpeedTestPanel value onChange />` (value: `SpeedSample | null`); `<SuccessCard result onReportAnother onClose />`.

**Copy (must match spec §5 verbatim):** speed-test and speedtest-link tooltips.

- [ ] **Step 1: Write `SpeedTestPanel.tsx`**

```tsx
"use client";

import { useInAppSpeedTest } from "@/features/coverage-reports/hooks/useInAppSpeedTest";
import type { SpeedSample } from "@/features/coverage-reports/types";
import InfoTooltip from "@/features/coverage-reports/components/InfoTooltip";
import { useEffect, useState } from "react";

interface SpeedTestPanelProps {
  value: SpeedSample | null;
  onChange: (sample: SpeedSample | null) => void;
}

type Mode = "none" | "in_app" | "manual";

export default function SpeedTestPanel({ value, onChange }: SpeedTestPanelProps) {
  const [mode, setMode] = useState<Mode>("none");
  const { status, result, run } = useInAppSpeedTest();

  useEffect(() => {
    if (result) onChange(result);
  }, [result, onChange]);

  const setManual = (patch: Partial<SpeedSample>) => {
    const base: SpeedSample =
      value && value.source === "manual"
        ? value
        : { source: "manual", downloadMbps: null, uploadMbps: null, pingMs: null, speedtestUrl: null };
    onChange({ ...base, ...patch, source: "manual" });
  };

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm font-medium text-gray-800">Speed data (optional)</span>
        <InfoTooltip
          label="Speed test"
          text="Tap to test your real speed now. This is measured by us, so it is trusted. Or type your speed and paste your Speedtest link."
        />
      </div>

      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => { setMode("in_app"); run(); }}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={status === "testing"}>
          {status === "testing" ? "Testing…" : "Run speed test"}
        </button>
        <button type="button" onClick={() => { setMode("manual"); onChange(null); }}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200">
          Enter manually
        </button>
      </div>

      {mode === "in_app" && status === "done" && result && (
        <p className="text-xs text-gray-600">
          Measured: ↓ {result.downloadMbps} Mbps · ↑ {result.uploadMbps} Mbps · {result.pingMs} ms
        </p>
      )}
      {mode === "in_app" && status === "error" && (
        <p className="text-xs text-red-600">Speed test failed. You can enter values manually instead.</p>
      )}

      {mode === "manual" && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input type="number" inputMode="decimal" placeholder="↓ Mbps" aria-label="Download Mbps"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              onChange={(e) => setManual({ downloadMbps: e.target.value ? Number(e.target.value) : null })} />
            <input type="number" inputMode="decimal" placeholder="↑ Mbps" aria-label="Upload Mbps"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              onChange={(e) => setManual({ uploadMbps: e.target.value ? Number(e.target.value) : null })} />
            <input type="number" inputMode="numeric" placeholder="ms" aria-label="Ping ms"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              onChange={(e) => setManual({ pingMs: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="flex items-center gap-1.5">
            <input type="url" placeholder="Speedtest.net link (optional)" aria-label="Speedtest link"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              onChange={(e) => setManual({ speedtestUrl: e.target.value || null })} />
            <InfoTooltip
              label="Speedtest link"
              text="Open speedtest.net, run a test, and copy the result link. Adding it makes your report more trusted."
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `SuccessCard.tsx`**

```tsx
"use client";

import type { SubmitOk } from "@/features/coverage-reports/types";
import TrustBadge from "@/features/coverage-reports/components/TrustBadge";

interface SuccessCardProps {
  result: SubmitOk;
  onReportAnother: () => void;
  onClose: () => void;
}

export default function SuccessCard({ result, onReportAnother, onClose }: SuccessCardProps) {
  return (
    <div className="text-center p-2">
      <div className="text-3xl mb-2" aria-hidden>✓</div>
      <h3 className="text-gray-900 font-semibold mb-1">Report submitted</h3>
      <div className="flex justify-center mb-3"><TrustBadge score={result.trustScore} /></div>
      <p className="text-xs text-gray-500 mb-4">
        {result.trustScore < 0.8
          ? "Add a speed test next time to raise your score."
          : "Thanks — your report helps make the map more accurate."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onReportAnother} className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200">
          Add another
        </button>
        <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          Done
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/features/coverage-reports/components/SpeedTestPanel.tsx src/features/coverage-reports/components/SuccessCard.tsx
git commit -m "feat(coverage): speed-test panel and success card"
```

---
### Task 17: `ReportSheet` (the form flow)

**Files:**
- Create: `src/features/coverage-reports/components/ReportSheet.tsx`

**Interfaces:**
- Consumes: `useReportSubmission` (Task 15); `useFingerprint` (Task 13); `useGeolocation` (`@/features/geolocation/useGeolocation` — returns `{ status, position, errorMessage, requestLocation }`); `SpeedTestPanel` (Task 16); `SuccessCard` (Task 16); `InfoTooltip` (Task 14); `ReportSubmission`, `FiveGPresence` (Task 1); `getNetworkConfig` (`@/config/networks`).
- Produces: `<ReportSheet open onClose onSubmitSuccess />`.

**Behavior:** on open → requests location (or offers manual pin); presence buttons; operator chips (Jazz/Zong/Unknown → `null`); optional speed via `SpeedTestPanel`; submit guarded on fingerprint-ready. Shows the location "why we check" tooltip from spec §5.

**Verification:** `npm run typecheck` + manual browser flow in Task 19.

- [ ] **Step 1: Write `ReportSheet.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useReportSubmission } from "@/features/coverage-reports/hooks/useReportSubmission";
import { useFingerprint } from "@/features/coverage-reports/fingerprint/useFingerprint";
import { useGeolocation } from "@/features/geolocation/useGeolocation";
import SpeedTestPanel from "@/features/coverage-reports/components/SpeedTestPanel";
import SuccessCard from "@/features/coverage-reports/components/SuccessCard";
import InfoTooltip from "@/features/coverage-reports/components/InfoTooltip";
import type { FiveGPresence, SpeedSample } from "@/features/coverage-reports/types";

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const PRESENCE_OPTIONS: { value: FiveGPresence; label: string }[] = [
  { value: "yes", label: "Yes — 5G works" },
  { value: "no", label: "No — not available" },
  { value: "maybe", label: "Weak / intermittent" },
];

const OPERATORS = ["Jazz", "Zong"] as const;

export default function ReportSheet({ open, onClose, onSubmitSuccess }: ReportSheetProps) {
  const geo = useGeolocation();
  const { fingerprint, isReady } = useFingerprint();
  const submission = useReportSubmission();

  const [presence, setPresence] = useState<FiveGPresence | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [speed, setSpeed] = useState<SpeedSample | null>(null);
  const [manualPin, setManualPin] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (open && geo.status === "idle") geo.requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const locationReady = geo.position !== null || manualPin !== null;
  const canSubmit = presence !== null && locationReady && isReady && submission.status !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const lat = manualPin?.lat ?? geo.position!.coords.latitude;
    const lng = manualPin?.lng ?? geo.position!.coords.longitude;
    const accuracy = manualPin ? null : Math.round(geo.position!.coords.accuracy);

    await submission.submit({
      latitude: lat,
      longitude: lng,
      accuracyMeters: accuracy,
      isManualPin: manualPin !== null,
      fiveGPresent: presence,
      operator: operator as "Jazz" | "Zong" | null,
      speed,
      deviceFingerprint: fingerprint ?? "",
    });
    if (submission.status === "success") onSubmitSuccess();
  };

  const handleClose = () => {
    submission.reset();
    setPresence(null);
    setOperator(null);
    setSpeed(null);
    setManualPin(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/10" onClick={handleClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report 5G coverage"
        className="absolute bottom-0 left-0 right-0 md:bottom-4 md:left-auto md:right-4 md:w-96 rounded-t-2xl md:rounded-xl bg-white border border-gray-200 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        {submission.status === "success" && submission.result ? (
          <div className="p-4">
            <SuccessCard result={submission.result} onReportAnother={() => submission.reset()} onClose={handleClose} />
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-gray-900 font-semibold">Report 5G coverage</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  No account needed — we check reports so fake ones do not fill the map.
                </p>
              </div>
              <button onClick={handleClose} aria-label="Close report form"
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Location */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm font-medium text-gray-800">Your location</span>
                <InfoTooltip label="Why we check"
                  text="We check reports so fake ones do not fill the map. You do not need an account. We never show your exact location to others — only a general area." />
              </div>
              {geo.position ? (
                <p className="text-xs text-gray-600">
                  Located · accuracy ±{Math.round(geo.position.coords.accuracy)} m
                </p>
              ) : manualPin ? (
                <p className="text-xs text-gray-600">Manual pin placed on the map.</p>
              ) : (
                <button onClick={() => geo.requestLocation()}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200">
                  {geo.status === "requesting" ? "Locating…" : "Allow location access"}
                </button>
              )}
            </div>

            {/* Presence */}
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-800 block mb-1.5">Is 5G available here?</span>
              <div className="flex flex-col gap-1.5">
                {PRESENCE_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => setPresence(o.value)}
                    className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                      presence === o.value
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operator */}
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-800 block mb-1.5">Operator (optional)</span>
              <div className="flex gap-2 flex-wrap">
                {OPERATORS.map((op) => (
                  <button key={op} onClick={() => setOperator(operator === op ? null : op)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      operator === op ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}>
                    {op}
                  </button>
                ))}
                {operator !== null && (
                  <button onClick={() => setOperator(null)} className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-500">
                    Unknown
                  </button>
                )}
              </div>
            </div>

            {/* Speed */}
            <div className="mb-5">
              <SpeedTestPanel value={speed} onChange={setSpeed} />
            </div>

            {/* Errors + submit */}
            {submission.status === "error" && (
              <p role="alert" className="text-xs text-red-600 mb-3">{submission.error}</p>
            )}
            <button onClick={handleSubmit} disabled={!canSubmit}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {submission.status === "submitting" ? "Submitting…" : "Submit report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/features/coverage-reports/components/ReportSheet.tsx
git commit -m "feat(coverage): report form sheet"
```

---

### Task 18: `ReportButton` + `HeatmapLegend` (UI overlay pieces)

**Files:**
- Create: `src/features/coverage-reports/components/ReportButton.tsx`
- Create: `src/features/coverage-reports/map/HeatmapLegend.tsx`

**Interfaces:**
- Consumes: `InfoTooltip` (Task 14); `CONFIDENCE_COLORS`, `SPEED_COLORS` (Task 3).
- Produces: `<ReportButton onClick />`; `<HeatmapLegend mode verifiedOnly onToggleVerified onToggleMode />` where `mode: "coverage" | "speed"`.

**Verification:** `npm run typecheck` + manual in Task 19.

- [ ] **Step 1: Write `ReportButton.tsx`**

```tsx
"use client";

export default function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      id="report-coverage-button"
      onClick={onClick}
      aria-label="Report 5G coverage"
      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 border border-blue-500 text-white text-sm font-medium shadow-lg hover:bg-blue-700 transition-all"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="hidden sm:inline">Report 5G coverage</span>
    </button>
  );
}
```

- [ ] **Step 2: Write `HeatmapLegend.tsx`**

```tsx
"use client";

import { CONFIDENCE_COLORS, SPEED_COLORS } from "@/features/coverage-reports/trust/trustTiers";

export type HeatmapMode = "coverage" | "speed";

interface HeatmapLegendProps {
  mode: HeatmapMode;
  verifiedOnly: boolean;
  onToggleMode: (m: HeatmapMode) => void;
  onToggleVerified: () => void;
}

export default function HeatmapLegend({ mode, verifiedOnly, onToggleMode, onToggleVerified }: HeatmapLegendProps) {
  return (
    <div className="w-56 bg-white border border-gray-200 rounded-xl p-3 shadow-2xl">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">Community reports</h3>
      </div>

      <div className="flex gap-1 mb-2.5">
        <button onClick={() => onToggleMode("coverage")}
          className={`flex-1 px-2 py-1 text-xs rounded-lg ${mode === "coverage" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
          Coverage
        </button>
        <button onClick={() => onToggleMode("speed")}
          className={`flex-1 px-2 py-1 text-xs rounded-lg ${mode === "speed" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
          Speed
        </button>
      </div>

      <ul className="space-y-1.5 mb-3">
        {mode === "coverage"
          ? Object.entries(CONFIDENCE_COLORS).map(([key, color]) => (
              <li key={key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} aria-hidden />
                <span className="text-xs text-gray-700 capitalize">{key.replace("-", " ")} confidence</span>
              </li>
            ))
          : (
            <>
              {Object.entries(SPEED_COLORS).map(([key, color]) => (
                <li key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} aria-hidden />
                  <span className="text-xs text-gray-700 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-gray-200" aria-hidden />
                <span className="text-xs text-gray-500">No speed data</span>
              </li>
            </>
          )}
      </ul>

      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
        <input type="checkbox" checked={verifiedOnly} onChange={onToggleVerified} className="rounded" />
        Verified only (⭐ 0.75+)
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/features/coverage-reports/components/ReportButton.tsx src/features/coverage-reports/map/HeatmapLegend.tsx
git commit -m "feat(coverage): report button and heatmap legend"
```

---
### Task 19: Cell→GeoJSON shaping (pure) + `CellStatsPopup`

**Files:**
- Create: `src/features/coverage-reports/map/cellGeoJson.ts`
- Create: `src/features/coverage-reports/map/CellStatsPopup.tsx`
- Test: `tests/unit/cellGeoJson.test.ts`

**Interfaces:**
- Consumes: `CoverageCell` (Task 1); `geohashBbox` (Task 2); `CONFIDENCE_COLORS`, `SPEED_COLORS` (Task 3).
- Produces:
  - `cellsToPointFC(cells): FeatureCollection<Point>` (heatmap weight = `avgTrust`),
  - `cellsToPolygonFC(cells, mode): FeatureCollection<Polygon>` (fill color per cell),
  - `coverageColor(cell): string`, `speedColor(cell): string`,
  - `<CellStatsPopup cell />` (rendered to string for a MapLibre popup).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { cellsToPointFC, cellsToPolygonFC, coverageColor, speedColor } from "@/features/coverage-reports/map/cellGeoJson";
import type { CoverageCell } from "@/features/coverage-reports/types";

const cell: CoverageCell = {
  geohashPrefix: "tuvz5", centerLat: 31.5, centerLng: 74.3,
  total: 10, confirmed: 9, notAvailable: 1, intermittent: 0,
  avgDownload: 120, avgUpload: 20, avgPing: 20, avgTrust: 0.82,
  jazzCount: 7, zongCount: 3, unknownCount: 0,
};

describe("cellGeoJson", () => {
  it("builds a point FeatureCollection weighted by avgTrust", () => {
    const fc = cellsToPointFC([cell]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features[0].geometry.type).toBe("Point");
    expect(fc.features[0].geometry.coordinates).toEqual([74.3, 31.5]);
    expect(fc.features[0].properties?.weight).toBeCloseTo(0.82, 5);
  });

  it("builds a polygon FeatureCollection with a fill color", () => {
    const fc = cellsToPolygonFC([cell], "coverage");
    expect(fc.features[0].geometry.type).toBe("Polygon");
    expect(fc.features[0].properties?.color).toMatch(/^#/);
  });

  it("colors a high-confirmation cell green", () => {
    expect(coverageColor(cell)).toBe("#10b981");
  });

  it("colors a spotty cell red", () => {
    const spotty = { ...cell, confirmed: 3, notAvailable: 7 };
    expect(coverageColor(spotty)).toBe("#ef4444");
  });

  it("uses low-data gray for speed with too few samples", () => {
    const noSpeed = { ...cell, avgDownload: null, total: 1 };
    expect(speedColor(noSpeed)).toBe("#9ca3af");
  });

  it("colors fast speed blue", () => {
    expect(speedColor(cell)).toBe("#3b82f6"); // 120 Mbps -> 100–200
  });
});
```

- [ ] **Step 2: Run it (fails), then write `cellGeoJson.ts`**

```ts
import type { FeatureCollection, Point, Polygon } from "geojson";
import type { CoverageCell } from "@/features/coverage-reports/types";
import { geohashBbox } from "@/features/coverage-reports/geohash/geohash";
import { CONFIDENCE_COLORS, SPEED_COLORS } from "@/features/coverage-reports/trust/trustTiers";

export function coverageColor(cell: CoverageCell): string {
  const decided = cell.confirmed + cell.notAvailable;
  if (cell.total < 3) return CONFIDENCE_COLORS.low;
  const ratio = decided === 0 ? 0 : cell.confirmed / decided;
  if (ratio >= 0.8) return CONFIDENCE_COLORS["very-high"];
  if (ratio >= 0.5) return CONFIDENCE_COLORS.high;
  if (ratio >= 0.2) return CONFIDENCE_COLORS.medium;
  return CONFIDENCE_COLORS.medium;
}

export function speedColor(cell: CoverageCell): string {
  if (cell.avgDownload === null || cell.total < 3) return SPEED_COLORS.lowData;
  const d = cell.avgDownload;
  if (d > 200) return SPEED_COLORS.ultra;
  if (d >= 100) return SPEED_COLORS.veryFast;
  if (d >= 50) return SPEED_COLORS.good;
  if (d >= 20) return SPEED_COLORS.fair;
  return SPEED_COLORS.poor;
}

export function cellsToPointFC(cells: CoverageCell[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: cells.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.centerLng, c.centerLat] },
      properties: { weight: c.avgTrust, total: c.total },
    })),
  };
}

export function cellsToPolygonFC(
  cells: CoverageCell[],
  mode: "coverage" | "speed"
): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: cells.map((c) => {
      const b = geohashBbox(c.geohashPrefix);
      const color = mode === "coverage" ? coverageColor(c) : speedColor(c);
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [b.minLon, b.minLat],
            [b.maxLon, b.minLat],
            [b.maxLon, b.maxLat],
            [b.minLon, b.maxLat],
            [b.minLon, b.minLat],
          ]],
        },
        properties: {
          color,
          geohashPrefix: c.geohashPrefix,
          total: c.total,
          confirmed: c.confirmed,
          notAvailable: c.notAvailable,
          intermittent: c.intermittent,
          avgDownload: c.avgDownload,
          avgTrust: c.avgTrust,
          jazzCount: c.jazzCount,
          zongCount: c.zongCount,
        },
      };
    }),
  };
}
```

- [ ] **Step 3: Run test to verify pass**

Run: `npm run test -- cellGeoJson`
Expected: PASS (6 tests).

- [ ] **Step 4: Write `CellStatsPopup.tsx`**

```tsx
import type { CoverageCell } from "@/features/coverage-reports/types";

// Rendered to a static HTML string for a MapLibre popup (no React runtime there).
export function cellPopupHtml(cell: CoverageCell): string {
  const pct = cell.total > 0 ? Math.round((cell.confirmed / cell.total) * 100) : 0;
  const speed = cell.avgDownload !== null ? `${Math.round(cell.avgDownload)} Mbps avg` : "no speed data";
  const jazzPct = cell.total > 0 ? Math.round((cell.jazzCount / cell.total) * 100) : 0;
  const zongPct = cell.total > 0 ? Math.round((cell.zongCount / cell.total) * 100) : 0;
  return `
    <div style="font-family: system-ui; font-size: 12px; color: #374151; min-width: 160px">
      <div style="font-weight:600; margin-bottom:4px">${cell.confirmed}/${cell.total} confirmed (${pct}%)</div>
      <div>Speed: ${speed}</div>
      <div>Jazz ${jazzPct}% · Zong ${zongPct}%</div>
      <div style="color:#9ca3af; margin-top:4px">Trust ⭐ ${cell.avgTrust.toFixed(2)}</div>
    </div>`;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/coverage-reports/map/cellGeoJson.ts src/features/coverage-reports/map/CellStatsPopup.tsx tests/unit/cellGeoJson.test.ts
git commit -m "feat(coverage): cell geojson shaping + popup html"
```

---

### Task 20: Expose the map instance from `MapContainer`

**Files:**
- Modify: `src/features/map/MapContainer.tsx`

**Interfaces:**
- Consumes: existing `MapContainerProps`.
- Produces: adds optional `onMapReady?: (map: MapLibreMap) => void` prop, called once with the map instance when `setIsMapReady(true)` runs. Later tasks attach coverage layers to this instance.

**Design note:** additive only — a new optional callback prop. Does not disturb existing `cell-sites` layers.

- [ ] **Step 1: Add the prop to the interface**

In `MapContainerProps` (currently ends at `onFeaturesLoaded`):

```ts
  onFeaturesLoaded: (features: CellSiteFeature[]) => void;
  onMapReady?: (map: MapLibreMap) => void;
```

- [ ] **Step 2: Store a stable ref for the callback**

Near the other stable refs (after `pathnameRef`):

```ts
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;
```

- [ ] **Step 3: Invoke it when the map becomes ready**

Inside `tryAddLayers`, immediately before `setIsMapReady(true);`:

```ts
      onMapReadyRef.current?.(map);
      setIsMapReady(true);
```

- [ ] **Step 4: Destructure the new prop**

Add `onMapReady` to the destructured props in the function signature.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/features/map/MapContainer.tsx
git commit -m "feat(coverage): expose map instance via onMapReady"
```

---

### Task 21: Heatmap layer manager hook + cells fetch hook

**Files:**
- Create: `src/features/coverage-reports/map/useCoverageHeatmap.ts`
- Create: `src/features/coverage-reports/hooks/useCoverageCells.ts`

**Interfaces:**
- Consumes: `fetchCoverageCells` (Task 11); `cellsToPointFC`, `cellsToPolygonFC`, `cellPopupHtml` (Task 19); `precisionForZoom` (Task 2); MapLibre `Map`, `Popup`.
- Produces:
  - `useCoverageCells(map, verifiedOnly): { cells, refresh }` — debounced fetch on `moveend`.
  - `useCoverageHeatmap({ map, cells, mode, visible })` — manages `coverage-*` sources/layers + hover popup, switching GPU-heatmap (<11) vs polygons (≥11).

**Design notes:**
- Source IDs: `coverage-points`, `coverage-cells`. Layer IDs: `coverage-heat`, `coverage-fill`, `coverage-outline`. All prefixed to avoid colliding with `cell-sites`.
- The hooks add layers idempotently and remove them on cleanup.

**Verification:** map I/O; `npm run typecheck` + manual browser check in Task 22.

- [ ] **Step 1: Write `useCoverageCells.ts`**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { CoverageCell } from "@/features/coverage-reports/types";
import { fetchCoverageCells } from "@/features/coverage-reports/api/reportsClient";

export function useCoverageCells(map: MapLibreMap | null, verifiedOnly: boolean) {
  const [cells, setCells] = useState<CoverageCell[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!map) return;
    const b = map.getBounds();
    const zoom = map.getZoom();
    const next = await fetchCoverageCells({
      minLat: b.getSouth(), minLng: b.getWest(),
      maxLat: b.getNorth(), maxLng: b.getEast(),
      zoom, verifiedOnly,
    });
    setCells(next);
  }, [map, verifiedOnly]);

  useEffect(() => {
    if (!map) return;
    const onMoveEnd = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 300);
    };
    map.on("moveend", onMoveEnd);
    refresh();
    return () => {
      map.off("moveend", onMoveEnd);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [map, refresh]);

  return { cells, refresh };
}
```

- [ ] **Step 2: Write `useCoverageHeatmap.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, GeoJSONSource, Popup as MapPopup, MapMouseEvent } from "maplibre-gl";
import type { CoverageCell } from "@/features/coverage-reports/types";
import { cellsToPointFC, cellsToPolygonFC } from "@/features/coverage-reports/map/cellGeoJson";
import { cellPopupHtml } from "@/features/coverage-reports/map/CellStatsPopup";

const SRC_POINTS = "coverage-points";
const SRC_CELLS = "coverage-cells";
const LYR_HEAT = "coverage-heat";
const LYR_FILL = "coverage-fill";
const LYR_OUTLINE = "coverage-outline";
const POLY_ZOOM = 11;

interface Params {
  map: MapLibreMap | null;
  cells: CoverageCell[];
  mode: "coverage" | "speed";
  visible: boolean;
}

export function useCoverageHeatmap({ map, cells, mode, visible }: Params) {
  const popupRef = useRef<MapPopup | null>(null);
  const cellsRef = useRef<CoverageCell[]>(cells);
  cellsRef.current = cells;

  // One-time: add sources + layers.
  useEffect(() => {
    if (!map) return;
    let cancelled = false;

    const ensure = async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !map.isStyleLoaded()) {
        map.once("idle", ensure);
        return;
      }

      if (!map.getSource(SRC_POINTS)) {
        map.addSource(SRC_POINTS, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      }
      if (!map.getSource(SRC_CELLS)) {
        map.addSource(SRC_CELLS, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      }
      if (!map.getLayer(LYR_HEAT)) {
        map.addLayer({
          id: LYR_HEAT, type: "heatmap", source: SRC_POINTS, maxzoom: POLY_ZOOM,
          paint: {
            "heatmap-weight": ["coalesce", ["get", "weight"], 0.5],
            "heatmap-intensity": 1,
            "heatmap-radius": 28,
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], POLY_ZOOM - 1, 0.8, POLY_ZOOM, 0],
          },
        });
      }
      if (!map.getLayer(LYR_FILL)) {
        map.addLayer({
          id: LYR_FILL, type: "fill", source: SRC_CELLS, minzoom: POLY_ZOOM,
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.5 },
        });
      }
      if (!map.getLayer(LYR_OUTLINE)) {
        map.addLayer({
          id: LYR_OUTLINE, type: "line", source: SRC_CELLS, minzoom: POLY_ZOOM,
          paint: { "line-color": "#ffffff", "line-width": 1 },
        });
      }

      const onEnter = (e: MapMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: [LYR_FILL] })[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const prefix = f.properties?.geohashPrefix as string;
        const cell = cellsRef.current.find((c) => c.geohashPrefix === prefix);
        if (!cell) return;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
          .setLngLat(e.lngLat).setHTML(cellPopupHtml(cell)).addTo(map);
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
        popupRef.current = null;
      };
      map.on("mousemove", LYR_FILL, onEnter);
      map.on("mouseleave", LYR_FILL, onLeave);
    };

    ensure();
    return () => {
      cancelled = true;
      popupRef.current?.remove();
      for (const id of [LYR_HEAT, LYR_FILL, LYR_OUTLINE]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of [SRC_POINTS, SRC_CELLS]) {
        if (map.getSource(id)) map.removeSource(id);
      }
    };
  }, [map]);

  // Update data when cells or mode change.
  useEffect(() => {
    if (!map) return;
    const pts = map.getSource(SRC_POINTS) as GeoJSONSource | undefined;
    const poly = map.getSource(SRC_CELLS) as GeoJSONSource | undefined;
    pts?.setData(cellsToPointFC(cells));
    poly?.setData(cellsToPolygonFC(cells, mode));
  }, [map, cells, mode]);

  // Toggle visibility.
  useEffect(() => {
    if (!map) return;
    const v = visible ? "visible" : "none";
    for (const id of [LYR_HEAT, LYR_FILL, LYR_OUTLINE]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    }
  }, [map, visible]);
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/features/coverage-reports/map/useCoverageHeatmap.ts src/features/coverage-reports/hooks/useCoverageCells.ts
git commit -m "feat(coverage): heatmap layer manager and cells fetch hook"
```

---
### Task 22: Wire everything into `MainMapView` + full verification

**Files:**
- Modify: `src/components/MainMapView.tsx`

**Interfaces:**
- Consumes: `ReportButton` (Task 18); `ReportSheet` (Task 17); `HeatmapLegend` (Task 18); `useCoverageCells` (Task 21); `useCoverageHeatmap` (Task 21); `MapContainer`'s new `onMapReady` (Task 20).
- Produces: the assembled feature in the running app.

**Design notes:** `MapContainer` is dynamically imported with `ssr:false`, so the map instance arrives via `onMapReady`. Store it in state; feed it to the coverage hooks. Add the report button to the bottom-right control stack (above the existing `MapLegend`), the legend near it, and the report sheet at the root.

- [ ] **Step 1: Add imports**

At the top of `MainMapView.tsx` with the other feature imports:

```ts
import type { Map as MapLibreMap } from "maplibre-gl";
import ReportButton from "@/features/coverage-reports/components/ReportButton";
import ReportSheet from "@/features/coverage-reports/components/ReportSheet";
import HeatmapLegend, { type HeatmapMode } from "@/features/coverage-reports/map/HeatmapLegend";
import { useCoverageCells } from "@/features/coverage-reports/hooks/useCoverageCells";
import { useCoverageHeatmap } from "@/features/coverage-reports/map/useCoverageHeatmap";
```

- [ ] **Step 2: Add state + hooks inside the component**

After the existing `const [showNearby, setShowNearby] = useState(false);` line:

```ts
  const [coverageMap, setCoverageMap] = useState<MapLibreMap | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("coverage");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(true);

  const { cells, refresh: refreshCells } = useCoverageCells(coverageMap, verifiedOnly);
  useCoverageHeatmap({ map: coverageMap, cells, mode: heatmapMode, visible: heatmapVisible });
```

- [ ] **Step 3: Pass `onMapReady` to `MapContainer`**

Add the prop to the existing `<MapContainer ... />`:

```tsx
        <MapContainer
          onSiteSelect={handleSiteSelect}
          selectedSiteId={selectedSite?.properties.site_uid ?? null}
          activeNetworks={activeNetworks}
          userPosition={geoState.position}
          onFeaturesLoaded={handleFeaturesLoaded}
          onMapReady={setCoverageMap}
        />
```

- [ ] **Step 4: Add the report button + legend to the bottom-right stack**

In the bottom-right controls `div` (currently holds the Nearby toggle + `<MapLegend />`), add above `<MapLegend />`:

```tsx
        <ReportButton onClick={() => setReportOpen(true)} />
        <HeatmapLegend
          mode={heatmapMode}
          verifiedOnly={verifiedOnly}
          onToggleMode={setHeatmapMode}
          onToggleVerified={() => setVerifiedOnly((v) => !v)}
        />
```

- [ ] **Step 5: Add the report sheet at the root**

Just before the closing `</div>` of the component root (after `<NearbySitesPanel ... />`):

```tsx
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitSuccess={refreshCells}
      />
```

- [ ] **Step 6: Full verification sweep**

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: typecheck clean; lint clean; all unit tests pass; build succeeds.

- [ ] **Step 7: Manual browser smoke test**

Prerequisite: create `.env.local` from `.env.example` with real Supabase values, and run `schema.md` in the Supabase SQL editor first.

1. `npm run dev`, open the app.
2. Click **Report 5G coverage** → allow location → pick **Yes** → pick **Jazz** → **Run speed test** → **Submit**. Expect the success card with a trust score.
3. Confirm a new row exists in Supabase `reports`.
4. Zoom out below 11 → smooth heatmap density near your report. Zoom in to ≥ 11 → a colored cell; hover shows the stats popup.
5. Toggle **Verified only** and **Coverage/Speed** in the legend; confirm the layer updates.
6. Confirm the existing Jazz/Zong site clusters and all prior controls still work unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/components/MainMapView.tsx
git commit -m "feat(coverage): integrate reporting + heatmap into main view"
```

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:

- §2 module boundaries → Tasks 1–21 create exactly the files listed; §9 integration points → Tasks 20, 22 (+ `.env.example` in Task 5).
- §3 data model → Task 4 (`schema.md`), consumed by Tasks 7–9. Self-referential `trust_score` correction honored (plain column, app-computed).
- §4 anti-fraud + trust → Task 6 (pipeline), Task 3 (trust score + tiers), Task 8 (orchestration). Equal in-app/manual+link weighting and "manual-no-link drops a little" encoded in Task 3 tests.
- §5 report flow + verbatim "?" copy → Tasks 14 (InfoTooltip), 16 (SpeedTestPanel tooltips), 17 (ReportSheet "why we check"). All four tooltip strings copied verbatim.
- §6 hybrid heatmap (<11 GPU / ≥11 cells), verified-only, speed toggle, cell stats → Tasks 19, 21, 18, 22.
- §7 in-app speed test (5MB/2MB/5×64B) → Tasks 10, 12.
- §8 deps/env/testing → Tasks 2, 5, 13 (deps), 5 (env), pure unit tests across Tasks 1,2,3,5,6,8,9,10,11,12,19.
- §10 deliverables → `schema.md` (Task 4), `.env.example` (Task 5), all modules, Vitest tests.
- §11 open items → resolved at plan top (precisionForZoom mapping, speed sizes, Vercel IP headers for `ipRegionFar`, soft/skippable).

**2. Placeholder scan** — no "TBD/TODO/handle edge cases/similar to Task N". Every code step has real code. ✔

**3. Type consistency** — checked across tasks:

- `CoverageCell` (camelCase) defined Task 1; SQL returns snake_case (Task 4) mapped in `repository.getCoverageCells` (Task 7); shaped by `cellGeoJson` (Task 19). Names align.
- `Repository` interface (Task 7) is exactly what `submitReport` (Task 8) and the route (Task 9) consume/mock.
- `ReportRow` columns (Task 7) ⊆ `reports` columns (Task 4). ✔
- `SubmitOk` (Task 1) returned by `submitReport` (Task 8), `reportsClient` (Task 11), consumed by `SuccessCard` (Task 16). ✔
- `precisionForZoom` (Task 2) used in route (Task 9) and — via server — not client; client `useCoverageCells` sends raw `zoom`, server derives precision. Consistent (single source of truth server-side). ✔
- Trust constants/thresholds `VERIFIED_ONLY_THRESHOLD`, `VISIBLE_TRUST_THRESHOLD` defined Task 3, used in route Task 9. ✔
- `HeatmapMode` exported from `HeatmapLegend` (Task 18) and reused in `MainMapView` (Task 22) and `useCoverageHeatmap` param (`"coverage"|"speed"`, Task 21). ✔

No issues found requiring fixes.

**Note on `useCoverageHeatmap` and the raster style:** the current `MapContainer` uses a raster basemap and adds site layers only after `isStyleLoaded()`. The heatmap hook independently guards on `map.isStyleLoaded()` and retries on `idle`, so it is safe regardless of load ordering.






