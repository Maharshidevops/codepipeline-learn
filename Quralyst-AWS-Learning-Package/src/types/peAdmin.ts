// PE Dataset — Admin Ops types (F28.2). Mirrors the backend contract
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md
// §PE Dataset — Admin Ops + "F28 admin-ops additions"). Staff-only surface;
// unified camelCase envelope. Distinct from the pe:dataset-gated firm/holdings/
// people reads in `pe.ts` — these back the `/pe/admin` operator console.
import type { PEScrapeJobStatus } from './pe';

// --- Pause + queue ---------------------------------------------------------

/** GET/POST /api/pe/admin/scraper-pause. `paused` = env override OR db toggle. */
export interface PEScraperPause {
  paused: boolean;
  dbPaused: boolean;
  /** When true the env override wins — the UI toggle is read-only-with-explanation. */
  envOverride: boolean;
}

/** Queue job row — the scrape-queue shape plus the F23.5 targetUrl/holdingsFound adds. */
export interface PEAdminQueueJob {
  id: string;
  firmId: string | null;
  ibFirmId: string | null;
  /** F64.4 — batch-resolved display name; null when unresolved, so the UI falls back to the id. */
  firmName: string | null;
  /** F64.5 — non-fatal problem codes. See {@link PEQueueJob.warnings}. */
  warnings: string[];
  jobType: string;
  /** F65 — the queue this job lives on, so fleet-wide rows can address per-job actions without
   *  the frontend assuming the jobType→queue identity. Null for an unrecognised legacy row. */
  queue: string | null;
  status: PEScrapeJobStatus;
  trigger: string;
  retryCount: number;
  errorMessage: string | null;
  claimedBy: string | null;
  targetUrl: string | null;
  holdingsFound: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  /**
   * Last worker heartbeat while the job was claimed. The backend has always sent this
   * (`PEJobService._job_row`); the type simply never declared it, so the fleet-wide table rendered
   * `startedAt` under a "Heartbeat" header — and once F50.2 defaulted that table to `pending`, where
   * `startedAt` is always null, the column became permanently "—" (F52.2).
   */
  heartbeatAt: string | null;
  /** F60 §9.4 / F61 §9 — scrape-health coverage fractions (0..1); null on non-portfolio jobs. */
  coverageStatus?: number | null;
  coverageWebsite?: number | null;
  coverageSector?: number | null;
  coverageGeography?: number | null;
  coverageDate?: number | null;
  coverageDescription?: number | null;
  seenCount?: number | null;
  staleRemoved?: number | null;
  replaceVerdict?: string | null;
}

/** Status-count bag (meta.counts on the queue read; queueDepth on stats). */
export interface PEQueueCounts {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

/** GET /api/pe/admin/scrape-queue — jobs + current pause state; counts come from meta. */
export interface PEAdminQueue {
  jobs: PEAdminQueueJob[];
  pause: PEScraperPause;
  counts: PEQueueCounts;
}

// --- F50: per-queue health + queue ops -------------------------------------
// The estate is seven collections since F46 (criteria/portfolio/people/enrichment/ib_scrape/
// projection/semantic), so these back the tabbed per-queue view. Contract: backend
// REF-API-CONTRACT.md §PE Dataset — Queue Observability & Ops.

/** One queue's health. `null` ages/latencies mean "no data", NOT zero — see the field docs. */
export interface PEQueueHealth {
  /**
   * F55 — `"error"` means this queue's read FAILED (all-zero counts are a fallback), `"ok"` means it
   * succeeded (including a genuinely empty queue). Absent on an older backend.
   */
  status?: 'ok' | 'error';
  queue: string;
  /** Operator vocabulary ("firms", "companies", …) — what to show in the tab. */
  label: string;
  collection: string;
  order: number;
  windowMinutes: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  /** Pending jobs that already burned their single auto-retry. */
  retrying: number;
  /** Failures carrying `[permanent]` — retrying cannot help these. */
  permanentFailures: number;
  /**
   * Age of the oldest pending job. **The starvation detector** for F46's priority-preference
   * ordering. `null` when nothing is pending — distinct from 0, which would mean "the head of
   * the queue is fresh".
   */
  oldestPendingAgeSeconds: number | null;
  /** Nearest-rank over the most recent ≤500 completions in the window; `null` if none. */
  p50LatencySeconds: number | null;
  p95LatencySeconds: number | null;
  latencySampleSize: number;
  throughputPerHour: number;
  completedInWindow: number;
  failedInWindow: number;
  /** failed ÷ (completed + failed) over the window, 0..1. */
  failureRate: number;
}

export interface PEQueueHealthTotals extends PEQueueCounts {
  retrying: number;
  permanentFailures: number;
  throughputPerHour: number;
  /** The single oldest waiting job anywhere in the fleet. */
  oldestPendingAgeSeconds: number | null;
  queueCount: number;
}

/**
 * One scraper worker PROCESS (F52). Distinct from a job's `heartbeatAt`, which only exists while a
 * job is claimed — an idle worker has no claimed job and so used to be invisible entirely.
 */
export interface PEWorkerRow {
  workerId: string;
  hostname: string | null;
  pid: number | null;
  version: string | null;
  startedAt: string | null;
  lastTickAt: string | null;
  /** Seconds since its last heartbeat. `null` = never wrote one. */
  ageSeconds: number | null;
  /** Derived from the interval THIS worker recorded, not from the web process's config. */
  staleAfterSeconds: number;
  alive: boolean;
  /** True on a deliberate scale-to-zero, so it is distinguishable from a crash. */
  stopping: boolean;
  heartbeatIntervalSeconds: number;
  concurrency: number;
  queueMaxSlots: number;
  slotsBusy: number;
  /** F51: handlers past the hard timeout, still running, still holding a slot. */
  abandonedThreads: number;
  lastDispatched: number;
  queues: string[];
  handlers: string[];
  pausedGlobal: boolean;
  pausedQueues: string[];
}

/**
 * GET /api/pe/admin/queues → `workerLiveness` (F52).
 *
 * `anyAlive` is the only field to branch on: every other number on that route is derived from job
 * rows, so "alive but idle" and "dead" are otherwise identical. `null` means the liveness read itself
 * failed — treat as no information, NOT as dead. Never alarm on a stale worker count: `workerId` rolls
 * on every process start and stale rows are TTL-reaped.
 */
export interface PEWorkerLiveness {
  status: 'ok' | 'unknown';
  workers: PEWorkerRow[];
  aliveCount: number;
  anyAlive: boolean | null;
  newestTickAgeSeconds: number | null;
  /** Fleet total across live workers. */
  abandonedThreads: number;
  /** Registered queues with no live handler — jobs there get claimed and permanently failed. */
  uncoveredQueues: string[];
}

/** GET /api/pe/admin/queues */
export interface PEQueuesHealth {
  /**
   * F55 — `"error"` when ANY queue's read failed. The trap this closes: on a dead DB connection the
   * per-queue reads degrade to all-zero, which is indistinguishable from a healthy idle fleet unless
   * you check this. Absent on an older backend, so treat missing as `"ok"`.
   */
  status?: 'ok' | 'error';
  /** F55 — the queues whose read failed, when {@link status} is `"error"`. */
  erroredQueues?: string[];
  queues: PEQueueHealth[];
  totals: PEQueueHealthTotals;
  windowMinutes: number;
  /** Queues an operator paused individually (the global pause wins regardless). */
  pausedQueues: string[];
  globalPause: PEScraperPause;
  /** F52 — absent on an older backend, so treat as optional at the seam. */
  workerLiveness?: PEWorkerLiveness;
}

/**
 * Job row for the F50 failure-review list. Deliberately richer than {@link PEAdminQueueJob}:
 * it carries `params` (the enrichment/semantic op selector — the most useful field when triaging
 * a failure) and `isPermanentFailure`, which the F28 `/scrape-queue` row does not expose.
 */
export interface PEQueueJob {
  id: string;
  queue: string;
  firmId: string | null;
  ibFirmId: string | null;
  /**
   * F64 unit 4 — the firm's display name, batch-resolved server-side. Null when the firm could
   * not be resolved (deleted, or a global job), in which case the UI falls back to the id.
   */
  firmName: string | null;
  jobType: string;
  status: PEScrapeJobStatus;
  trigger: string;
  retryCount: number;
  errorMessage: string | null;
  isPermanentFailure: boolean;
  /**
   * F64 unit 5 — machine-readable codes for non-fatal problems
   * (`pass_truncated:location_standardize`, `low_coverage:website`, `drain_over_budget`, …).
   * `errorMessage` only ever describes a failure, so without these a job that completed while
   * quietly dropping half a firm's holdings looked identical to a clean one.
   */
  warnings: string[];
  params: Record<string, unknown>;
  targetUrl: string | null;
  claimedBy: string | null;
  heartbeatAt: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/** GET /api/pe/admin/queues/{queue}/jobs — rows plus the pagination `meta`. */
export interface PEQueueJobsPage {
  jobs: PEQueueJob[];
  total: number;
  page: number;
  pageSize: number;
}

/** Statuses a purge may target. The backend 400s on `pending`/`running` so live work is safe. */
export type PEPurgeableStatus = 'failed' | 'completed';

// --- F50: Tier-5 pipeline (data) health ------------------------------------
// Each sub-object carries its OWN `status`. A failing read is `{status: 'error'}` with no other
// keys, so every field below is optional and a consumer must check `status` first.

export interface PEProjectionStaleness {
  status: 'ok' | 'error';
  activeFirms?: number;
  withStateRow?: number;
  /** Active firms with no successful projection at all. */
  neverProjected?: number;
  dirty?: number;
  dirtyReasons?: Record<string, number>;
  withLastError?: number;
  maxStalenessSeconds?: number | null;
  p95StalenessSeconds?: number | null;
  maxDirtyAgeSeconds?: number | null;
  projectionQueuePending?: number | null;
  /**
   * **The detector-of-the-detector.** F47 derives "this firm changed" from read-only timestamps,
   * so a missed signal is otherwise invisible: rising staleness with an EMPTY projection queue and
   * nothing marked dirty means the change detector is not marking firms it should.
   *
   * F53: also true when {@link scanCoverageStalled} is — read that field to tell the two apart.
   */
  suspectedMissedSignal?: boolean;

  /**
   * F53 — seconds since the change detector last finished a pass over EVERY active firm. `null`
   * before the first pass completes on a fresh install.
   */
  secondsSinceFullScan?: number | null;
  /** How long a full pass should take at the current dataset size and sweep cadence. */
  expectedFullScanSeconds?: number | null;
  /** Seconds since the detector last swept at all — what {@link scanCoverageStalled} derives from. */
  secondsSinceLastSweep?: number | null;
  /** False on a fresh install — "unknown", which is deliberately not treated as stalled. */
  everCompletedFullScan?: boolean;
  /** The estate is paused, so the sweep is meant to be stopped; suppresses {@link scanCoverageStalled}. */
  scraperPaused?: boolean;
  /**
   * F53 — the detector has missed several consecutive sweeps, i.e. it is not running. Derived from
   * {@link secondsSinceLastSweep}, not from cycle age (a large estate legitimately takes many
   * sweeps per cycle), and suppressed while {@link scraperPaused}.
   *
   * Why it matters: it is NOT that the other counts cannot see unscanned firms — one with no state
   * row is counted in `neverProjected`. The blind spot is post-backfill, once every active firm has
   * a state row: a firm the detector never re-scans keeps `dirty: false` and merely ages, so every
   * term of {@link suspectedMissedSignal} reads clean while `maxStalenessSeconds` climbs. This is
   * the term that closes that hole, and the backend ORs it into {@link suspectedMissedSignal}.
   */
  scanCoverageStalled?: boolean;
}

export interface PESemanticCoverage {
  status: 'ok' | 'error';
  embeddingModel?: string;
  projectedFirms?: number;
  firmsWithVector?: number;
  firmVectorCoveragePct?: number | null;
  /** Vectors on a DIFFERENT embedding model — a different vector space, not merely old. */
  staleModelFirms?: number;
  liveDistinctCompanies?: number;
  companyVectors?: number;
  companyVectorCoveragePct?: number | null;
  staleModelCompanies?: number;
  /** Cost proxy: near zero in steady state thanks to the content-hash gate. */
  companyVectorsWritten24h?: number;
}

export interface PEChangeGating {
  status: 'ok' | 'error';
  windowHours?: number;
  portfolioScrapesCompleted?: number;
  projectionsCompleted?: number;
  /** ~1.0 means the change gate is not gating; `null` when there were no scrapes. */
  projectionsPerScrape?: number | null;
}

/** GET /api/pe/admin/pipeline-health */
export interface PEPipelineHealth {
  projectionStaleness: PEProjectionStaleness;
  semanticCoverage: PESemanticCoverage;
  changeGating: PEChangeGating;
}

// --- Monitoring stats ------------------------------------------------------

/** GET /api/pe/admin/stats — tables-first monitoring roll-up (no chart lib, F28.2 v1). */
export interface PEAdminStats {
  windowMinutes: number;
  throughput: { completed: number; perMinute: number };
  failureRate: { permanent: number; transient: number; total: number; rate: number };
  /** Per-strategy completed-job counts (strategy name → count). */
  perStrategy: Record<string, number>;
  queueDepth: PEQueueCounts;
  /** Peak concurrency in the window — batch progress uses this, not cumulative counts. */
  peakInFlight: number;
}

// --- Dedup preview + merge -------------------------------------------------

/** A firm inside a dedup candidate group (or a near-miss cluster). */
export interface PEDedupFirm {
  id: string;
  name: string;
  websiteUrl: string | null;
  hostKey: string;
  status: string;
  holdingsCount: number;
  peopleCount: number;
}

/** A collision group keyed by firm_host_key — an operator picks one survivor. */
export interface PEDedupGroup {
  hostKey: string;
  firms: PEDedupFirm[];
}

/** A fuzzy name cluster — informational only, never auto-merged / selectable. */
export interface PEDedupNearMiss {
  score: number;
  firms: PEDedupFirm[];
}

/** GET /api/pe/admin/dedup-firms — preview. */
export interface PEDedupPreview {
  groups: PEDedupGroup[];
  nearMissNames: PEDedupNearMiss[];
  groupCount: number;
  nearMissCount: number;
}

/** POST /api/pe/admin/dedup-firms body. */
export interface PEDedupMergeBody {
  survivorId: string;
  loserIds: string[];
}

/** POST /api/pe/admin/dedup-firms result summary (re-pointed counts + correction). */
export interface PEDedupResult {
  survivorId: string;
  hostKey: string;
  mergedLoserIds: string[];
  holdingsMoved: number;
  peopleMoved: number;
  jobsMoved: number;
  reviewItemsMoved: number;
  correctionsRecorded: number;
  holdingsCount: number;
  peopleCount: number;
}

// --- Hygiene / enrich triggers ---------------------------------------------

/** The F28 trigger ops (path segments under /api/pe/admin/) + CU.5's run-talent-flow. */
export type PEAdminTriggerOp =
  | 'check-stale-holdings'
  | 'clean-holdings'
  | 'cleanup-people'
  | 'post-import-cleanup'
  | 'enrich-descriptions'
  | 'assign-sectors'
  | 'tag-sectors'
  | 'tag-statuses'
  | 'fill-criteria'
  | 'sanitize-holding-urls'
  | 'enrich-investment-dates'
  | 'recheck-investment-dates'
  | 'backfill-portfolio-from-bio'
  | 'summarize-bios'
  | 're-scrape-people-detail'
  | 'holdings/re-enrich-missing-descriptions'
  | 'run-talent-flow';

/** Shared trigger request body (all fields optional). */
export interface PETriggerBody {
  firmId?: string;
  dryRun?: boolean;
  limit?: number;
  minYears?: number;
}

/** 202 payload — the op was enqueued (it never runs inline). */
export interface PETriggerResult {
  op: string;
  enqueued: boolean;
  jobId: string | null;
}

/** GET /api/pe/admin/{op}/status — for the ops that expose a drain state. */
export interface PETriggerStatus {
  op: string;
  isRunning: boolean;
  lastRun: string | null;
}

// --- Not-found removal-review queues ---------------------------------------

export type PENotFoundKind = 'holdings' | 'people';

/**
 * A pending removal-review row (reasons `stale_removal`/`inflated_portfolio`/`exit_check`).
 * The backend contract pins only `data: {items:[…]}`; display fields are best-effort and
 * optional so the table degrades gracefully if the row shape shifts.
 */
export interface PENotFoundItem {
  id: string;
  reason: string;
  targetType?: string | null;
  targetId?: string | null;
  firmId?: string | null;
  firmName?: string | null;
  companyName?: string | null;
  name?: string | null;
  detail?: string | null;
  createdAt?: string | null;
}

// --- Portfolio-companies quality roll-up + backfill ------------------------

export interface PEQualityTierCounts {
  valid: number;
  suspect: number;
  invalid: number;
}

/** GET /api/pe/admin/portfolio-companies-quality — coverage + quality over live holdings. */
export interface PEPortfolioQuality {
  total: number;
  scanned: number;
  /** true when the scan hit its cap (partial roll-up). */
  capped: boolean;
  overallTiers: PEQualityTierCounts;
  /** Issue-type → count (best-effort; contract leaves the shape open). */
  issues: Record<string, number>;
  /** Field → coverage ratio 0..1. */
  coverage: Record<string, number>;
  /** Field → present count. */
  coverageCounts: Record<string, number>;
}

/** POST /api/pe/admin/reset-and-backfill — 202; re-runs the global enrichment drain. */
export interface PEResetBackfillResult {
  op?: string;
  enqueued?: boolean;
  jobId?: string | null;
}

/** POST /api/pe/admin/queue-sample-rescrape — enqueues a re-scrape for the stalest firms. */
export interface PESampleRescrapeResult {
  sampled: number;
  queued: number;
  skipped: number;
}

// --- pe_dataset access grants (CU.5; backend F23.1 + CU.3 service move) ------

/** One row of GET /api/pe/admin/access-grants — a user holding an explicit grant. */
export interface PEAccessGrant {
  userId: string;
  email: string;
  grantedAt: string | null;
}

/** POST /api/pe/admin/access-grants response — the toggled user. */
export interface PEAccessGrantResult {
  userId: string;
  email: string;
  granted: boolean;
}

// --- Enrichment pipeline status (CU.5; backend CU.3) -------------------------

/** GET /api/pe/admin/pipeline-status — drain lock state + last run + registries. */
export interface PEPipelineStatus {
  isRunning: boolean;
  /** Most-recent drain summary for the scope (shape open — per-pass results). */
  lastRun: Record<string, unknown> | null;
  ops: string[];
  passes: string[];
}
