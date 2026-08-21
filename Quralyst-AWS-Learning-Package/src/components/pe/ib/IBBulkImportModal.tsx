// Bulk-import modal for the IB directory (F34.4). A textarea of bank URLs (one per line, ≤200) →
// POST /api/ib/bulk-import → shows per-URL created / exists / error results. Hostname dedupe +
// name-from-domain happen server-side; we surface the returned rows verbatim. Built on the shared
// Modal primitive (focus trap + Esc-close). On success the caller invalidates the banks list.
// Types: `src/types/ib.ts`.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Badge, Button, Modal, Textarea } from '@/components/ui';
import { ibService } from '@/services/api';
import type { ApiError, IBBulkImportResult, IBBulkImportStatus } from '@/types';

const STATUS_TONE: Record<IBBulkImportStatus, 'success' | 'secondary' | 'danger'> = {
  created: 'success',
  exists: 'secondary',
  error: 'danger',
};

function parseUrls(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function IBBulkImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** Fired after a successful import so the parent can refetch the banks list. */
  onImported: () => void;
}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<IBBulkImportResult | null>(null);

  const urls = parseUrls(text);
  const tooMany = urls.length > 200;

  const mutation = useMutation({
    mutationFn: () => ibService.bulkImport(urls),
    onSuccess: (data) => {
      setResult(data);
      onImported();
    },
  });

  function reset() {
    setText('');
    setResult(null);
    mutation.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  const errorMessage = (mutation.error as unknown as ApiError | null)?.message;

  return (
    <Modal open={open} onClose={handleClose} title="Bulk import banks" size="lg">
      <div data-testid="ib-bulk-import">
        <p className="text-muted small">
          Paste bank website URLs, one per line (up to 200). Each new bank is de-duplicated by
          hostname and queued for a first scrape.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'https://example-advisors.com\nhttps://another-bank.com'}
          rows={6}
          aria-label="Bank URLs to import"
          error={tooMany ? 'Please import at most 200 URLs at a time.' : undefined}
        />

        {errorMessage && (
          <div className="text-danger small mb-2" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="d-flex gap-2 mb-3">
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={urls.length === 0 || tooMany}
            data-testid="ib-bulk-import-submit"
          >
            Import {urls.length > 0 ? `(${urls.length})` : ''}
          </Button>
          <Button variant="popup-secondary" onClick={handleClose}>
            Close
          </Button>
        </div>

        {result && (
          <div data-testid="ib-bulk-import-results">
            <div className="mb-2 small fw-medium">{result.created} created</div>
            <div className="table-responsive" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">URL</th>
                    <th scope="col">Result</th>
                    <th scope="col">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={`${r.url}-${i}`} data-testid={`bulk-row-${r.status}`}>
                      <td className="text-break small">{r.url}</td>
                      <td>
                        <Badge tone={STATUS_TONE[r.status]}>
                          <span data-testid="bulk-status" data-status={r.status}>
                            {r.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="small">{r.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
