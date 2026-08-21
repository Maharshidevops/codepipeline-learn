import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { enrichService, type EnrichMode } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { EnrichJobState } from './types';

const MODES: { mode: EnrichMode; label: string }[] = [
  { mode: 'contacts', label: 'Contacts' },
  { mode: 'company_data', label: 'Company data' },
  { mode: 'all', label: 'Contacts + company' },
];

export default function EnrichDropdown({
  resultId,
  listType,
  enrichJob,
  onStart,
}: {
  resultId: string;
  listType: string;
  enrichJob: EnrichJobState | null;
  onStart: (job: EnrichJobState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [force, setForce] = useState(false);
  const [starting, setStarting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function launch(mode: EnrichMode) {
    setStarting(true);
    setOpen(false);
    try {
      const res = await enrichService.start({
        resultId,
        mode,
        listType,
        forceReenrich: force,
      });
      onStart({
        mode,
        total: res.total ?? 0,
        done: res.done ?? res.processed ?? 0,
        skipped: res.skipped ?? 0,
        failed: res.failed ?? 0,
        running: res.running ?? res.status === 'running',
        byCompany: res.byCompany ?? {},
      });
      toast.info('Enrichment started — this runs in the background.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Enrichment failed to start.');
    } finally {
      setStarting(false);
    }
  }

  const isRunning = enrichJob?.running;
  const processed = enrichJob ? enrichJob.done + enrichJob.skipped + enrichJob.failed : 0;

  if (isRunning) {
    return (
      <button type="button" className="btn btn-sm btn-outline-secondary" disabled>
        <Loader2 className="me-1" style={{ width: 14, height: 14 }} />
        Enriching… {processed} / {enrichJob!.total || '?'}
      </button>
    );
  }

  return (
    <div className="position-relative" ref={menuRef}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        disabled={starting}
        onClick={() => setOpen((o) => !o)}
      >
        {starting ? (
          <Loader2 style={{ width: 14, height: 14 }} className="me-1" />
        ) : (
          <Sparkles style={{ width: 14, height: 14 }} />
        )}
        Enrich
      </button>
      {open && (
        <div
          className="dropdown-menu show shadow-sm p-2"
          style={{ minWidth: 220, right: 0, left: 'auto' }}
        >
          <div className="small text-muted px-2 py-1">Enrich this list</div>
          {MODES.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              className="dropdown-item rounded"
              onClick={() => void launch(mode)}
            >
              {label}
            </button>
          ))}
          <div className="dropdown-divider" />
          <label className="dropdown-item-text small d-flex align-items-center gap-2 mb-0">
            <input
              type="checkbox"
              className="form-check-input m-0"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
            />
            Force re-enrich existing rows
          </label>
        </div>
      )}
    </div>
  );
}
