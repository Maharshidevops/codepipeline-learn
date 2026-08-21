// MandateComposer (Tier A / A12 / F11) — paste/upload a mandate or CIM and let the AI prefill a
// research wizard. Parses via mandateService, stashes the structured prefill (composerPrefill),
// and navigates to the chosen wizard which hydrates its form on mount. Advisory only — the user
// still reviews every field before running.
import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { mandateService, type MandateIntent } from '@/services/api';
import { storeComposerPrefill } from '@/features/research/composerPrefill';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';

const ACCEPT = '.pdf,.docx,.xlsx,.xls,.csv,.txt,.json';
const MAX_TOTAL_BYTES = 60 * 1024 * 1024; // mirrors the backend cap

type Destination = 'target' | 'strategic';

export default function MandateComposer() {
  const navigate = useNavigate();
  const toast = useToast();
  const [text, setText] = useState('');
  const [urls, setUrls] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dest, setDest] = useState<Destination>('target');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;
    const next = [...files, ...picked];
    if (next.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
      toast.error('Attachments exceed the 60 MB total limit.');
      return;
    }
    setFiles(next);
  };

  const removeFile = (i: number) => setFiles((fs) => fs.filter((_, idx) => idx !== i));

  const parse = async () => {
    const urlList = urls
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (!text.trim() && !files.length && !urlList.length) {
      toast.error('Paste some text, add a file, or a URL first.');
      return;
    }
    const intent: MandateIntent = dest === 'strategic' ? 'example-buyer-profile' : 'default';
    setBusy(true);
    try {
      const prefill = await mandateService.parseMandate({ text, files, urls: urlList, intent });
      storeComposerPrefill(prefill);
      toast.success('Mandate parsed — review the prefilled criteria.');
      navigate(dest === 'strategic' ? paths.strategic : paths.targetList);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not parse that mandate.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="criteria-card criteria-card--white mb-4 p-4">
      <h3 className="criteria-title mb-1">Start from a mandate or CIM</h3>
      <p className="text-muted small mb-3">
        Paste a mandate, drop a document (PDF/DOCX/XLSX/CSV), or add links — the AI extracts the
        search criteria and prefills the wizard for you to review.
      </p>

      <textarea
        className="form-control mb-2"
        rows={4}
        placeholder="Paste the mandate / CIM text here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Mandate text"
      />

      <input
        className="form-control mb-2"
        placeholder="Optional: reference URLs (comma or newline separated, up to 5)"
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        aria-label="Reference URLs"
      />

      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <button
          type="button"
          className="btn btn-standard btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <i className="bi bi-paperclip me-1" aria-hidden="true" /> Add files
        </button>
        <input
          ref={fileRef}
          type="file"
          className="d-none"
          accept={ACCEPT}
          multiple
          onChange={onPickFiles}
          aria-label="Upload mandate files"
        />
        {files.map((f, i) => (
          <span key={`${f.name}-${i}`} className="badge bg-light text-dark border">
            {f.name}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 ms-1 text-danger"
              aria-label={`Remove ${f.name}`}
              onClick={() => removeFile(i)}
            >
              <i className="bi bi-x" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3">
        <label className="small mb-0">
          Prefill:{' '}
          <select
            className="form-select form-select-sm d-inline-block w-auto"
            value={dest}
            onChange={(e) => setDest(e.target.value as Destination)}
            aria-label="Destination wizard"
          >
            <option value="target">Target List</option>
            <option value="strategic">Buyer List (Strategic)</option>
          </select>
        </label>
        <button type="button" className="btn btn-standard" onClick={parse} disabled={busy}>
          {busy ? <Spinner size="sm" /> : <i className="bi bi-magic me-1" aria-hidden="true" />}{' '}
          Parse &amp; prefill
        </button>
      </div>
    </div>
  );
}
