// MandateHelperBar (Tier A / A11 / F10) — AI accelerators for a business-description field:
//  • Inline website URL bar → backend safe-fetches + summarizes the site → writes a description
//    (and may return a suggested industry). Matches Replit TargetMode (no popup).
//  • "Upload PDF" → hidden file input → backend extracts text + summarizes → writes a description.
// Both feed the parent via onDescription; the website helper may also call onSuggestedIndustry.
// Failures toast without clearing the user's existing input (spec §A11 / F10 P6).
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Spinner } from '@/components/ui';
import { researchService } from '@/services/api';
import { useToast } from '@/hooks/useToast';

// Mirror the backend single-file PDF cap (F10 / app/routers/research.py::_PDF_MAX_BYTES).
const PDF_MAX_BYTES = 15 * 1024 * 1024;

export interface MandateHelperBarProps {
  /** Called with the generated company description (never called with empty text). */
  onDescription: (text: string) => void;
  /** Optional — the website helper may return a suggested industry to preselect. */
  onSuggestedIndustry?: (industry: string) => void;
  className?: string;
}

export default function MandateHelperBar({
  onDescription,
  onSuggestedIndustry,
  className,
}: MandateHelperBarProps) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<'website' | 'pdf' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runWebsite = async () => {
    const u = url.trim();
    if (!u) {
      toast.error('Enter a website URL first.');
      return;
    }
    setBusy('website');
    try {
      const r = await researchService.describeFromWebsite(u);
      if (r.description) onDescription(r.description);
      if (r.suggested_industry && onSuggestedIndustry) onSuggestedIndustry(r.suggested_industry);
      setUrl('');
      toast.success('Description generated from the website.');
    } catch {
      toast.error('Could not read that website. Check the URL and try again.');
    } finally {
      setBusy(null);
    }
  };

  const onUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void runWebsite();
    }
  };

  const onPickPdf = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.size > PDF_MAX_BYTES) {
      toast.error('PDF is too large (15MB max).');
      return;
    }
    setBusy('pdf');
    try {
      const r = await researchService.describeFromPdf(file);
      if (r.description) onDescription(r.description);
      toast.success('Description generated from the PDF.');
    } catch {
      toast.error('Could not read that PDF. Try a different file.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={['lb-website-bar', className].filter(Boolean).join(' ')}>
      <div className="lb-website-bar__url">
        <input
          id="mandate-url"
          type="url"
          className="form-control form-control-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onUrlKeyDown}
          placeholder="example.com"
          aria-label="Company website URL"
          disabled={busy !== null}
        />
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm lb-fit-button"
          onClick={() => void runWebsite()}
          disabled={busy !== null || !url.trim()}
        >
          {busy === 'website' ? (
            <Spinner size="sm" />
          ) : (
            <i className="bi bi-globe me-1" aria-hidden="true" />
          )}{' '}
          From website
        </button>
      </div>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm lb-fit-button"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== null}
      >
        {busy === 'pdf' ? (
          <Spinner size="sm" />
        ) : (
          <i className="bi bi-filetype-pdf me-1" aria-hidden="true" />
        )}{' '}
        Upload PDF
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="d-none"
        onChange={onPickPdf}
        aria-label="Upload a PDF to describe"
      />
    </div>
  );
}
