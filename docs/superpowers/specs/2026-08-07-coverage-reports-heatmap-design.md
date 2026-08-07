# Design: Community 5G Coverage Reporting & Heatmap (Foundation + Heatmap slice)

**Date:** 2026-08-07
**Status:** Approved (design), pending implementation plan
**Scope owner slice:** Foundation + Heatmap (slice 1 of a multi-slice feature)

---

## 1. Purpose & Scope

Enable the public to report real-world 5G coverage (and optionally speed) **without logging in**, protect the data with a passive anti-fraud + trust-scoring pipeline, and visualize the aggregated result as a hybrid heatmap on the existing map.

### In scope (this slice)

- Database schema (Supabase Postgres) for reports + rate-limit logging.
- Report submission API (`POST /api/reports`) with the full anti-fraud + trust pipeline running server-side.
- Device fingerprinting via FingerprintJS (open-source).
- Report form flow: presence (yes/no/maybe) + operator + optional speed.
- Speed capture **two ways**: in-app measured speed test **and** manual mbps entry with an optional Ookla (speedtest.net) share link.
- Hybrid heatmap: native GPU density at low zoom → clickable geohash cells with hover/tap stats at high zoom.
- "Verified only" toggle (re-queries aggregation with a higher trust floor).
- Friendly "?" explainer tooltips in simple, non-native-friendly English.
- `schema.md` at repo root: a paste-into-Supabase SQL script.
- Unit tests for the pure logic (trust score, geohash, anti-fraud checks) + a mocked submit-pipeline test.

### Deferred to later slices (explicitly NOT built here)

- Community voting (👍/👎) and disagreement reasons.
- Recent-reports feed.
- Share-report links.
- Temporal-pattern fraud detection and device reputation history.

The trust engine and API are designed so these plug in later as additional trust deltas / endpoints without a rewrite.

### Non-goals / hard constraints

- **No server-side Speedtest.net verification.** Ookla has no public API to fetch a result by URL; scraping result pages is fragile and against their ToS. Pasted links are stored as an *unverified claim* and clearly labelled as such in the UI. The only genuinely trusted speed number is the in-app measured test.
- **No PostGIS.** Aggregation uses geohash strings + btree indexes on lat/lng. Lighter, sufficient at this scale.
- **No extra managed services.** Rate limiting is done in Postgres. Stack stays Supabase (DB + Storage) + Vercel (hosting) only.
- Nothing in the existing codebase is rewritten. Only three small wiring points are touched (see §9).

---

## 2. Architecture & Module Boundaries

New code lives in a self-contained feature folder mirroring the existing `src/features/<feature>` convention. Each unit has one clear purpose, a typed interface, and is independently testable.

```
src/
  features/coverage-reports/
    types.ts                      # domain types (Report, CoverageCell, SpeedSample, …)
    schemas/report.schema.ts      # Zod: submit payload + API response validation
    trust/computeTrustScore.ts    # PURE function — fully unit-tested
    trust/trustTiers.ts           # 0-1 score → tier label + color mapping
    fingerprint/useFingerprint.ts # FingerprintJS wrapper (client hook)
    geohash/geohash.ts            # encode / decode-to-bbox / precisionForZoom (wraps ngeohash)
    api/reportsClient.ts          # typed fetch wrappers (submitReport, getCoverageCells)
    hooks/useReportSubmission.ts  # form submit state machine
    hooks/useCoverageCells.ts     # bbox+zoom → cells, debounced on map move
    hooks/useInAppSpeedTest.ts    # runs download/upload/latency test against our endpoints
    components/
      ReportButton.tsx            # floating "Report 5G Coverage" FAB
      ReportSheet.tsx             # the form flow (yes/no/maybe, operator, speed)
      SpeedTestPanel.tsx          # in-app test OR manual mbps + optional link
      TrustBadge.tsx              # ⭐ score chip
      InfoTooltip.tsx             # the "?" explainers (simple English)
      SuccessCard.tsx             # post-submit summary
    map/
      useCoverageHeatmap.ts       # manages MapLibre sources/layers for reports
      HeatmapLegend.tsx           # confidence/speed legend + Verified-only toggle
      CellStatsPopup.tsx          # hover/tap cell stats

  server/reports/
    repository.ts                 # all DB reads/writes (Supabase service-role client)
    antiFraud.ts                  # composable check pipeline
    submitReport.ts               # orchestrates checks → trust → insert

  lib/supabase/
    server.ts                     # server-side client (service role key)
    client.ts                     # browser client (anon) — reserved for future direct reads

  app/api/reports/route.ts             # POST submit · GET cells (bbox+precision)
  app/api/speedtest/download/route.ts  # streams N bytes (client times the download)
  app/api/speedtest/upload/route.ts    # accepts bytes (client times the upload)
```

**Key principle — writes never touch the DB from the browser.** All submissions go through `/api/reports`, where the anti-fraud pipeline runs server-side with the service-role key. This is what makes "no login" safe: the client cannot bypass rate limits or trust scoring. The anon `client.ts` is included only for a potential future read path and is unused in this slice.

**Coexistence with existing map layers.** The coverage heatmap uses its own MapLibre source/layer IDs (prefixed `coverage-*`) and is fully separable from the existing `cell-sites` cluster layers in `MapContainer.tsx`. Official sites and community reports never collide.

---

## 3. Data Model

Two tables, two functions, no PostGIS. This section is the source of truth for `schema.md`.

### `reports`

| column | type | notes |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `latitude` | double precision not null | full precision, server-only |
| `longitude` | double precision not null | full precision, server-only |
| `geohash` | text not null | precision-7; indexed; drives aggregation |
| `accuracy_meters` | int | browser GPS accuracy; null for manual pin |
| `is_manual_pin` | boolean not null default false | true when user placed pin without GPS |
| `five_g_present` | text not null | check in (`'yes'`,`'no'`,`'maybe'`) |
| `operator` | text | check in (`'Jazz'`,`'Zong'`) or null; reuses networks config |
| `speed_source` | text | check in (`'in_app'`,`'manual'`) or null |
| `download_mbps` | real | nullable |
| `upload_mbps` | real | nullable |
| `ping_ms` | int | nullable |
| `speedtest_url` | text | optional Ookla share link (unverified) |
| `device_fingerprint` | text not null | FingerprintJS visitorId |
| `ip_hash` | text not null | salted SHA-256 of client IP — raw IP never stored |
| `trust_score` | real not null | 0.0–1.0, computed in app at insert |
| `status` | text not null default `'visible'` | `'visible'` if trust ≥ 0.20 else `'hidden'` |
| `created_at` | timestamptz not null default `now()` | |

**Indexes:** `geohash`; `(latitude, longitude)`; `created_at`; partial index on `status = 'visible'`.

**Privacy:** `latitude`, `longitude`, `ip_hash`, `device_fingerprint` are server-only. The public API returns **only aggregated geohash cells**, never individual raw points — so precise report locations can never be listed by a client.

### `report_submissions_log`

`(id uuid pk, ip_hash text not null, device_fingerprint text not null, created_at timestamptz default now())`

Written by the rate-limit function; used only for counting. Indexed on `(ip_hash, created_at)` and `(device_fingerprint, created_at)`.

### Function: `check_rate_limit(p_ip_hash text, p_fingerprint text) returns boolean`

Atomically inserts a log row and returns whether the submission is allowed, enforcing (tunable constants at top of `schema.md`):

- ≤ 5 submissions/hour per IP
- ≤ 10 submissions/day per device fingerprint
- ≥ 5 minutes between submissions from the same IP

Returns `false` (and does **not** log) when a limit is exceeded, so a rejected attempt doesn't push the window forward.

### Function: `get_coverage_cells(min_lat, min_lng, max_lat, max_lng, p_precision int, p_min_trust real, p_verified_only boolean) returns table(...)`

Aggregates `reports` where `status='visible'`, trust ≥ `p_min_trust`, coordinates within the bbox, grouped by `left(geohash, p_precision)`. Returns per cell:

- `geohash_prefix`, `center_lat`, `center_lng`
- `total`, `confirmed` (yes), `not_available` (no), `intermittent` (maybe)
- `avg_download`, `avg_upload`, `avg_ping` (over rows with speed data)
- `avg_trust`
- `jazz_count`, `zong_count`, `unknown_count`

Powers **both** heatmap modes (centroids → GPU points at low zoom; cells → polygons at high zoom).

### RLS

Enabled on both tables. All app traffic uses the service-role key server-side, so anon direct access is denied. Policies are written so enabling a future public read of aggregated data is a one-line addition.

> **Correction from the original spec draft:** the proposed `trust_score` `GENERATED` column referenced itself, which is invalid Postgres. Trust is computed in the app layer (a pure, tested function) and stored as a plain `real` column.

---

## 4. Anti-Fraud & Trust Model

### Pipeline (`server/reports/antiFraud.ts`)

An ordered list of composable checks. Each has the shape `(ctx) => { pass: boolean; reason?: string; trustDelta?: number }`. The orchestrator (`submitReport.ts`) runs them in order; the first hard failure short-circuits with a friendly message.

Order:

1. **Rate limit** — calls `check_rate_limit` RPC. Hard reject on false.
2. **Fingerprint present & well-formed** — non-empty, plausible length. Hard reject otherwise.
3. **Coordinates valid & within Pakistan bounds** (lat 23–37, lng 60–78). Hard reject otherwise.
4. **Speed sanity** — if speed present: download/upload in (0, 5000] mbps, ping in [1, 2000] ms. Impossible values → hard reject.
5. **IP-region vs reported-location sanity** (soft) — if the coarse IP region is far from the reported location, apply a trust penalty (not a reject). IP→region uses a coarse lookup; if unavailable, skip silently.

### Trust score (`trust/computeTrustScore.ts`, pure)

Base 50, normalized to 0–1. Constants are named at the top of the file so tuning is a one-line change.

```
Base                                          50

Speed evidence:
  in-app measured test                       +30
  manual entry + Ookla link                  +30      (equal to in-app, per product decision)
  manual entry, no link                      +18      (dropped a little — missing verification)
  no speed data                               +0

GPS accuracy:
  < 30 m                                     +20
  30–100 m                                   +10
  > 100 m                                     +0
  manual pin (no GPS)                         −5

Penalties:
  IP region far from reported location       −20
  impossible speed                     → rejected in pipeline (never scored)

trust = clamp(raw, 0, 100) / 100
```

**Tiers (`trust/trustTiers.ts`):**

- `status = 'visible'` if trust ≥ 0.20, else `'hidden'`.
- Heatmap confidence tiers: ≥ 0.75 very high · 0.60–0.74 high · 0.40–0.59 medium · 0.20–0.39 low.
- Verified-only view uses `min_trust = 0.75`.

**Product note (recorded, not a blocker):** in-app measured speed is harder to fake than a typed number + link, so in-app *may* later be weighted above manual. They are equal now per explicit product decision; the constants make re-tuning trivial. Community voting (later slice) adds further +/- deltas at this layer.

---

## 5. Report Flow & "?" Explainer Copy

Floating **"Report 5G Coverage"** button → bottom sheet (mobile) / side panel (desktop), styled to match the existing `SiteDetailSheet` and the white theme.

Steps:

1. Request location permission → show accuracy; if denied, allow a manual pin drop (`is_manual_pin = true`).
2. **Is 5G working here?** → Yes / No / Maybe.
3. Operator (optional): Jazz / Zong / Unknown.
4. Speed (optional): **[Run speed test]** (in-app measured) *or* **[Enter manually]** (download / upload / ping fields + optional Ookla link).
5. Submit → `SuccessCard` showing the resulting trust score and what would raise it.

### Approved "?" tooltip copy (simple, non-native-friendly English)

- **Trust score:** "This score shows how sure we are the report is real. Higher score means more people can trust it. Adding a speed test or a Speedtest link makes your score higher."
- **Why we check:** "We check reports so fake ones do not fill the map. You do not need an account. We never show your exact location to others — only a general area."
- **Speed test:** "Tap to test your real speed now. This is measured by us, so it is trusted. Or type your speed and paste your Speedtest link."
- **Speedtest link:** "Open speedtest.net, run a test, and copy the result link. Adding it makes your report more trusted."

---

## 6. Heatmap Rendering (Hybrid)

Single data source, one hook (`useCoverageCells`) fetching `get_coverage_cells` on map `moveend` (debounced ~300 ms), passing bbox + a precision derived from zoom + the verified-only flag. `useCoverageHeatmap` translates the result into MapLibre sources/layers.

- **Zoom < 11:** cell centroids become trust-weighted points in MapLibre's native GPU **heatmap** layer — smooth density gradient.
- **Zoom ≥ 11:** geohash cells drawn as fill polygons, colored by coverage confidence (green → amber → red → gray per the palette below), with a **speed-coloring toggle**. Hover/tap → `CellStatsPopup` (e.g. "48/52 confirmed · avg 125 Mbps · Jazz 67% / Zong 42% · ⭐0.88").
- **Verified-only toggle** in `HeatmapLegend` re-queries with `min_trust = 0.75`.

**Precision by zoom** (in `geohash.precisionForZoom`): low zoom → shorter geohash prefix (larger cells); high zoom → longer prefix (smaller cells). Concrete mapping defined in the plan.

**Confidence palette:** `#10b981` strong · `#f59e0b` likely · `#ef4444` spotty · `#9ca3af` low-data.
**Speed palette:** `#7c3aed` >200 · `#3b82f6` 100–200 · `#10b981` 50–100 · `#f59e0b` 20–50 · `#ef4444` <20 · `#9ca3af` <3 samples.

---

## 7. In-App Speed Test

`useInAppSpeedTest` measures against our own Vercel endpoints so the number is trustworthy:

- **Download:** GET `/api/speedtest/download?bytes=N` streams N random bytes; client times receipt → mbps.
- **Upload:** POST `/api/speedtest/upload` with a fixed-size body; client times send → mbps.
- **Latency:** small round-trips to the download endpoint; median → ms.

Sizes/iterations chosen to be meaningful but cheap (defined in the plan). Runs only on explicit user tap. Results feed the form with `speed_source = 'in_app'`.

---

## 8. Dependencies, Environment, Testing

**New dependencies:**

- `@supabase/supabase-js` — DB access.
- `@fingerprintjs/fingerprintjs` — device fingerprint (open-source).
- `ngeohash` — geohash encode/decode (small, vetted).

**New env vars (added to `.env.example`, real values in `.env.local`):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (reserved for future reads)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `SUPABASE_IP_HASH_SALT` (server-only; salts the IP hash)

**Testing (Vitest, matching existing setup):**

- Pure unit tests: `computeTrustScore` (each factor + clamping), `geohash` (encode/decode/precisionForZoom), each anti-fraud check.
- Submit-pipeline test with a mocked repository (checks order, short-circuit, trust persisted, status derivation). No live DB in CI.

---

## 9. Integration Points (existing files touched)

Minimal, additive edits only:

1. **`src/components/MainMapView.tsx`** — mount `<ReportButton>` and wire the coverage heatmap + `<HeatmapLegend>` alongside existing overlays.
2. **`src/features/map/MapContainer.tsx`** — expose the map instance (or a small imperative handle) so `useCoverageHeatmap` can attach its `coverage-*` sources/layers; add the coverage layers without disturbing `cell-sites` layers.
3. **`.env.example`** — document the four new env vars.

(`MapLegend.tsx` may get one legend line pointing users to the coverage layer; optional.)

---

## 10. Deliverables

- All modules under §2.
- `schema.md` at repo root: extensions, both tables, indexes, both functions, RLS policies, with tunable constants + run instructions documented at the top.
- Updated `.env.example`.
- Vitest unit tests per §8.

---

## 11. Open Items / Assumptions

- **IP→region lookup** for the soft geo penalty: if no lookup source is configured, the check is skipped silently (no penalty, no reject). Exact source chosen in the plan; the penalty is deliberately soft so this never blocks a legitimate report.
- **Precision-by-zoom mapping** and **speed-test sizes/iterations**: concrete numbers finalized in the implementation plan.
- **Not a git repository:** the design doc cannot be committed. If git is initialized later, commit this file as the first history entry for the feature.
