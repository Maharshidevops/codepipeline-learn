// PE People — export flow (F25.2/F25.3). Paste firm URLs → POST /export/resolve to review which
// firms matched (exact), partially matched (parent-domain / non-root fallback, carries a warning),
// or did not match → POST /export to download the CSV (a `text/csv` carve-out streamed through the
// http seam, not the JSON envelope). Data flows through peService (resolveExport / exportPeople).
import { useState } from 'react';
import { peService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Button, Modal, Textarea } from '@/components/ui';
import type { ApiError, PEPeopleResolveResult } from '@/types';

interface PeopleExportModalProps {
  open: boolean;
  onClose: () => void;
}

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
}

export default function PeopleExportModal({ open, onClose }: PeopleExportModalProps) {
  const toast = useToast();
  const [urls, setUrls] = useState('');
  const [resolved, setResolved] = useState<PEPeopleResolveResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setUrls('');
    setResolved(null);
    setError(null);
    setBusy(false);
    onClose();
  }

  async function review() {
    const list = parseUrls(urls);
    if (list.length === 0) {
      setError('Paste at least one firm URL.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResolved(await peService.resolveExport(list));
    } catch (e) {
      setError((e as ApiError)?.message || 'Could not resolve those URLs.');
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!resolved) return;
    const firmIds = [
      ...resolved.matched.map((m) => m.firmId),
      ...resolved.partialMatches.map((m) => m.firmId),
    ];
    const uniqueIds = Array.from(new Set(firmIds));
    if (uniqueIds.length === 0) {
      setError('No firms matched — nothing to export.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await peService.exportPeople(uniqueIds);
      toast.success('CSV downloaded.');
      close();
    } catch (e) {
      setError((e as ApiError)?.message || 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open onClose={close} title="Export people to CSV" size="lg">
      {!resolved ? (
        <>
          <p className="text-muted">
            Paste firm website URLs (one per line). We match them to tracked firms before exporting.
          </p>
          <Textarea
            id="export-urls"
            label="Firm URLs"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={6}
            placeholder="https://vistaequitypartners.com&#10;https://example-capital.com"
          />
          {error && (
            <div className="alert alert-danger mt-2" role="alert">
              {error}
            </div>
          )}
          <div className="d-flex gap-2 justify-content-end mt-3">
            <Button variant="popup-secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={review} disabled={busy}>
              {busy ? 'Reviewing…' : 'Review'}
            </Button>
          </div>
        </>
      ) : (
        <>
          {resolved.matched.length > 0 && (
            <div className="mb-3">
              <h6 className="mb-1">Matched ({resolved.matched.length})</h6>
              <ul className="list-unstyled mb-0 small">
                {resolved.matched.map((m) => (
                  <li key={m.firmId}>{m.firmName}</li>
                ))}
              </ul>
            </div>
          )}
          {resolved.partialMatches.length > 0 && (
            <div className="mb-3">
              <h6 className="mb-1">Partial matches ({resolved.partialMatches.length})</h6>
              <ul className="list-unstyled mb-0 small">
                {resolved.partialMatches.map((m) => (
                  <li key={`${m.firmId}-${m.inputUrl}`}>
                    {m.firmName} <span className="text-warning">— {m.warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resolved.unmatched.length > 0 && (
            <div className="mb-3">
              <h6 className="mb-1">Unmatched ({resolved.unmatched.length})</h6>
              <ul className="list-unstyled mb-0 small text-muted">
                {resolved.unmatched.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <div className="d-flex gap-2 justify-content-end mt-3">
            <Button variant="popup-secondary" onClick={() => setResolved(null)}>
              Back
            </Button>
            <Button
              onClick={download}
              disabled={busy || resolved.matched.length + resolved.partialMatches.length === 0}
            >
              {busy ? 'Exporting…' : 'Download CSV'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
