// Progress service — opens a transport-agnostic ProgressSource for a running process: it wraps a
// native EventSource against the backend SSE endpoint. Components/hooks consume only the
// ProgressSource interface. Also exposes stop + disconnect-beacon.
import { endpoints } from '@/services/endpoints';
import { http } from '@/services/http';
import type {
  PEPeopleProcessType,
  ProcessType,
  ProgressEventName,
  ProgressSource,
  ProgressUpdateEvent,
} from '@/types';

/**
 * Any process the SSE dispatcher can stream. The research pipeline uses `ProcessType`; the PE
 * People batch ops (F25.2) register their own `processType`s and reuse this same SSE seam via
 * the existing dispatcher default branch (no new endpoint).
 */
export type StreamProcessType = ProcessType | PEPeopleProcessType;

export interface OpenStreamOptions {
  processId: string;
  processType: StreamProcessType;
  fileNames?: string[];
  resultId?: string;
}

/** Real-mode wrapper around the browser EventSource → ProgressSource. */
class EventSourceProgressSource implements ProgressSource {
  private es: EventSource | null = null;
  private listeners: Partial<Record<ProgressEventName, ((d: ProgressUpdateEvent) => void)[]>> = {};

  constructor(private readonly url: string) {}

  on(ev: ProgressEventName, cb: (d: ProgressUpdateEvent) => void): void {
    (this.listeners[ev] ??= []).push(cb);
  }

  private fire(ev: ProgressEventName, data: ProgressUpdateEvent): void {
    this.listeners[ev]?.forEach((cb) => cb(data));
  }

  start(): void {
    this.es = new EventSource(this.url);
    this.es.addEventListener('connected', (e) =>
      this.fire('connected', JSON.parse((e as MessageEvent).data)),
    );
    this.es.addEventListener('progress_update', (e) =>
      this.fire('progress', JSON.parse((e as MessageEvent).data)),
    );
    this.es.addEventListener('completed', (e) => {
      this.fire('complete', JSON.parse((e as MessageEvent).data));
      this.stop();
    });
    this.es.addEventListener('progress_error', (e) =>
      this.fire('error', JSON.parse((e as MessageEvent).data)),
    );
  }

  stop(): void {
    this.es?.close();
    this.es = null;
  }
}

export interface ProgressService {
  openStream(opts: OpenStreamOptions): ProgressSource;
  notifyDisconnect(processId: string, processType: ProcessType): void;
  stop(processType: ProcessType): Promise<void>;
}

export const progressService: ProgressService = {
  openStream: ({ processId, processType }) => {
    const url = `${endpoints.progress.sse}?process_id=${encodeURIComponent(
      processId,
    )}&process_type=${encodeURIComponent(processType)}`;
    return new EventSourceProgressSource(url);
  },
  notifyDisconnect: (processId, processType) => {
    const payload = JSON.stringify({ process_id: processId, process_type: processType });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(endpoints.progress.notifyDisconnect, payload);
    } else {
      void http(endpoints.progress.notifyDisconnect, { method: 'POST', body: payload });
    }
  },
  stop: (processType) => {
    const path =
      processType === 'financial_verticals'
        ? endpoints.progress.fvPoll.replace('/progress', '/stop')
        : endpoints.progress.poll.replace('/progress', '/stop');
    return http<void>(path, { method: 'POST' });
  },
};
