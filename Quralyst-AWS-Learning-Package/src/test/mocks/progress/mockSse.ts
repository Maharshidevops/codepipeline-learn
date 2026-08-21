// MockProgressSource — synthetic SSE emitter replacing the live progress stream in dummy-data mode.
// Ramps overall_percentage 0→100 on a setInterval, walking the realistic stage list with per-file
// progress and file stats, then emits a final `complete` event carrying a result_id (→ redirect).
// Implements the same ProgressSource transport interface the real native-EventSource wrapper uses,
// so swapping to FastAPI changes only progressService — never a component.
import type { ProcessType, ProgressEventName, ProgressSource, ProgressUpdateEvent } from '@/types';

// Ordered (stage key, % ceiling, subtitle copy) for the target/strategic pipeline.
const TARGET_STAGES: { stage: string; ceiling: number; message: string }[] = [
  { stage: 'initializing', ceiling: 4, message: 'Preparing your request…' },
  { stage: 'started', ceiling: 8, message: 'Kicking off the search…' },
  { stage: 'phase1_fetch', ceiling: 18, message: 'Gathering candidate companies…' },
  { stage: 'apollo_search', ceiling: 28, message: 'Searching Apollo for matches…' },
  { stage: 'gmaps_search', ceiling: 36, message: 'Scanning local business listings…' },
  { stage: 'merging_sources', ceiling: 44, message: 'Merging results from all sources…' },
  { stage: 'merge_deduplication', ceiling: 50, message: 'Removing duplicate companies…' },
  { stage: 'standardization', ceiling: 58, message: 'Standardizing company records…' },
  { stage: 'location_enrichment', ceiling: 66, message: 'Enriching location data…' },
  { stage: 'size_filtering', ceiling: 73, message: 'Applying size criteria…' },
  { stage: 'gpt_filtering', ceiling: 80, message: 'Scoring fit against your criteria…' },
  { stage: 'contact_enrichment', ceiling: 88, message: 'Finding contacts & executives…' },
  { stage: 'news_enrichment', ceiling: 93, message: 'Adding recent company news…' },
  { stage: 'organizing_data', ceiling: 97, message: 'Organizing your results…' },
  { stage: 'saving_results', ceiling: 100, message: 'Finalizing your list…' },
];

// FV pipeline stage list (simpler — no multi-source merge).
const FV_STAGES: { stage: string; ceiling: number; message: string }[] = [
  { stage: 'initializing', ceiling: 6, message: 'Preparing your request…' },
  { stage: 'started', ceiling: 14, message: 'Searching financial verticals…' },
  { stage: 'mapping', ceiling: 32, message: 'Mapping target attributes…' },
  { stage: 'size_filtering', ceiling: 52, message: 'Applying size & EBITDA criteria…' },
  { stage: 'gpt_filtering', ceiling: 72, message: 'Scoring PE exposure & fit…' },
  { stage: 'organizing_data', ceiling: 90, message: 'Organizing your results…' },
  { stage: 'saving_results', ceiling: 100, message: 'Finalizing your list…' },
];

export interface MockProgressOptions {
  processType: ProcessType;
  fileNames?: string[];
  /** result id the completion event redirects to. */
  resultId?: string;
  /** ms between ticks (default 220ms → ~10s run). */
  tickMs?: number;
}

export class MockProgressSource implements ProgressSource {
  private listeners: Partial<Record<ProgressEventName, ((d: ProgressUpdateEvent) => void)[]>> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private pct = 0;
  private stopped = false;
  private readonly stages: { stage: string; ceiling: number; message: string }[];
  private readonly opts: Required<MockProgressOptions>;

  constructor(options: MockProgressOptions) {
    this.opts = {
      fileNames: [],
      resultId: 'mock-result-1',
      tickMs: 220,
      ...options,
    };
    this.stages = options.processType === 'financial_verticals' ? FV_STAGES : TARGET_STAGES;
  }

  on(ev: ProgressEventName, cb: (d: ProgressUpdateEvent) => void): void {
    (this.listeners[ev] ??= []).push(cb);
  }

  private emit(ev: ProgressEventName, data: ProgressUpdateEvent): void {
    this.listeners[ev]?.forEach((cb) => cb(data));
  }

  private currentStage() {
    return this.stages.find((s) => this.pct <= s.ceiling) ?? this.stages[this.stages.length - 1];
  }

  private perFileProgress(): Record<string, number> {
    const files = this.opts.fileNames;
    if (files.length === 0) return {};
    const out: Record<string, number> = {};
    files.forEach((name, i) => {
      // Stagger files so they finish in sequence as overall progress climbs.
      const start = (i / files.length) * 100;
      const span = 100 / files.length;
      out[name] = Math.max(0, Math.min(100, Math.round(((this.pct - start) / span) * 100)));
    });
    return out;
  }

  start(): void {
    // Connected handshake, then ramp.
    this.emit('connected', this.snapshot());
    this.timer = setInterval(() => {
      if (this.stopped) return;
      // ~1.5–3% per tick for a lively but smooth climb.
      this.pct = Math.min(100, this.pct + 1.5 + (this.pct % 3));
      if (this.pct >= 100) {
        this.pct = 100;
        this.emit('progress', this.snapshot());
        this.complete();
        return;
      }
      this.emit('progress', this.snapshot());
    }, this.opts.tickMs);
  }

  private snapshot(): ProgressUpdateEvent {
    const stage = this.currentStage();
    const files = this.opts.fileNames;
    const completedFiles = files.filter((f) => (this.perFileProgress()[f] ?? 0) >= 100).length;
    return {
      overall_percentage: Math.round(this.pct),
      current_stage: stage.stage,
      activity_message: stage.message,
      status: this.pct >= 100 ? 'completed' : 'processing',
      file_names: files,
      per_file_progress: this.perFileProgress(),
      current_file_index: Math.min(completedFiles, Math.max(files.length - 1, 0)),
      current_file_name: files[Math.min(completedFiles, Math.max(files.length - 1, 0))],
    };
  }

  private complete(): void {
    this.clear();
    this.emit('complete', {
      ...this.snapshot(),
      overall_percentage: 100,
      current_stage: 'completed',
      status: 'completed',
      result_id: this.opts.resultId,
    });
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.clear();
    this.emit('error', {
      ...this.snapshot(),
      current_stage: 'stopped',
      status: 'stopped',
      stopped_by_user: true,
    });
  }

  private clear(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
