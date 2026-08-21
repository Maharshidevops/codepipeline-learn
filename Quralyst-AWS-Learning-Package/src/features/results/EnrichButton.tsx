// EnrichButton (Tier A / A8 / F14) — post-hoc Apollo enrichment on a finished result. Pick a mode,
// start the job, then poll status → progress; on completion refresh the rows (onComplete). Only
// fills empty contact/company fields (never overwrites CRM edits) and consumes credits per company.
import { useEffect, useRef, useState } from 'react';
import { enrichService, type EnrichMode, type EnrichStatus } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export interface EnrichButtonProps {
  resultId: string;
  listType?: string;
  onComplete?: () => void;
}

export default function EnrichButton({
  resultId,
  listType = 'target',
  onComplete,
}: EnrichButtonProps) {
  const toast = useToast();
  const [mode, setMode] = useState<EnrichMode>('contacts');
  const [status, setStatus] = useState<EnrichStatus | null>(null);
  const pollRef = useRef<number | null>(null);
  const running = status?.status === 'running';

  const stopPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPoll, []);

  const poll = () => {
    stopPoll();
    pollRef.current = window.setInterval(async () => {
      try {
        const s = await enrichService.getStatus(resultId, mode);
        setStatus(s);
        if (s.status === 'completed' || s.status === 'failed' || s.status === 'idle') {
          stopPoll();
          if (s.status === 'completed') {
            toast.success(s.message || 'Enrichment complete.');
            onComplete?.();
          } else if (s.status === 'failed') {
            toast.error(s.message || 'Enrichment failed.');
          }
        }
      } catch {
        /* transient — keep polling */
      }
    }, 2000);
  };

  const start = async () => {
    try {
      const s = await enrichService.start({ resultId, mode, listType });
      setStatus(s);
      toast.info('Enrichment started — this runs in the background.');
      poll();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not start enrichment.');
    }
  };

  return (
    <div className="d-flex gap-1 align-items-center">
      <select
        className="form-select form-select-sm w-auto"
        value={mode}
        onChange={(e) => setMode(e.target.value as EnrichMode)}
        disabled={running}
        aria-label="Enrichment mode"
      >
        <option value="contacts">Contacts</option>
        <option value="company_data">Company data</option>
        <option value="all">Contacts + company</option>
      </select>
      <button
        type="button"
        className="btn btn-standard btn-sm"
        onClick={start}
        disabled={running}
        title="Fill missing contact/company details from Apollo (uses credits)"
      >
        <i className="bi bi-person-lines-fill me-1" aria-hidden="true" />
        {running ? `Enriching ${status?.processed ?? 0}/${status?.total ?? 0}…` : 'Enrich contacts'}
      </button>
    </div>
  );
}
