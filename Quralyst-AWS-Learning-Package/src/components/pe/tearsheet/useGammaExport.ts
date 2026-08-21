// Shared state for the polished Gamma export actions (inline viewer, new tab, downloads).
// Surfaces with `load` fetch the PDF up front, so a download button is only ever live when the
// bytes are in hand — an unavailable export (410 expired link / 404 never produced) becomes a
// `GammaExportProblem` the UI can explain, instead of a failed click or a tab of raw JSON.
import { useCallback, useEffect, useRef, useState } from 'react';
import { emitErrorToast } from '@/lib/toastBus';
import {
  describeGammaExportError,
  downloadGammaExport,
  fetchGammaExport,
  objectUrlFor,
  openGammaPdf,
  revokeObjectUrl,
  saveGammaExport,
  type GammaExportKind,
  type GammaExportProblem,
} from '@/components/pe/tearsheet/openGammaPdf';

export type GammaExportAction = GammaExportKind | 'open';

/**
 * Nothing on the wire says whether the PPTX export will work: it needs a stored Gamma deck id and a
 * live Gamma API key, and asking means paying for a full export. So a failure is remembered per
 * tearsheet for the session and the surfaces drop the button, rather than offering a click that can
 * only repeat the same error. Cleared by a retry / re-render.
 */
const pptxUnavailable = new Set<string>();

/** Test-only reset for the module-level PPTX memo. */
export function __resetGammaExportMemoForTests(): void {
  pptxUnavailable.clear();
}

export interface UseGammaExportResult {
  /** Object URL for the inline viewer — set once the PDF has been fetched. */
  pdfUrl: string | null;
  /** The up-front PDF fetch is still in flight. */
  loading: boolean;
  /** The PDF fetched cleanly, so a download is guaranteed to produce a real file. */
  pdfAvailable: boolean;
  /** False once a PPTX export has failed for this tearsheet — hide the button rather than retry it. */
  pptxAvailable: boolean;
  /** Blocking failure (nothing to show or save); drives the error banner. */
  problem: GammaExportProblem | null;
  /** Which action is in flight, so the button can show a spinner. */
  pending: GammaExportAction | null;
  openInNewTab: () => void;
  download: (kind: GammaExportKind) => void;
  /** Drop the loaded PDF and fetch again — after a retry or a Gamma re-render. */
  retry: () => void;
}

export function useGammaExport(
  tearsheetId: string,
  companyName: string,
  { load = false }: { load?: boolean } = {},
): UseGammaExportResult {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(load);
  const [pdfAvailable, setPdfAvailable] = useState(false);
  const [pptxAvailable, setPptxAvailable] = useState(() => !pptxUnavailable.has(tearsheetId));
  const [problem, setProblem] = useState<GammaExportProblem | null>(null);
  const [pending, setPending] = useState<GammaExportAction | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pdfUrlRef = useRef<string | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);

  const adoptPdf = useCallback((blob: Blob | null) => {
    revokeObjectUrl(pdfUrlRef.current);
    pdfBlobRef.current = blob;
    pdfUrlRef.current = blob ? objectUrlFor(blob) : null;
    setPdfUrl(pdfUrlRef.current);
    setPdfAvailable(!!blob);
  }, []);

  useEffect(() => () => revokeObjectUrl(pdfUrlRef.current), []);

  useEffect(() => {
    if (!load || !tearsheetId) return;
    let cancelled = false;
    setLoading(true);
    setProblem(null);
    fetchGammaExport(tearsheetId, 'pdf').then(
      (blob) => {
        if (cancelled) return;
        adoptPdf(blob);
        setLoading(false);
      },
      (error: unknown) => {
        if (cancelled) return;
        adoptPdf(null);
        setProblem(describeGammaExportError(error, 'pdf'));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [adoptPdf, attempt, load, tearsheetId]);

  // The banner explains a blocker; a failure that leaves something usable on screen (a PPTX
  // error, or a PDF that already loaded) only needs the toast.
  const report = useCallback(
    (error: unknown, kind: GammaExportKind) => {
      const next = describeGammaExportError(error, kind);
      if (kind === 'pdf' && !pdfAvailable) setProblem(next);
      if (kind === 'pptx') {
        pptxUnavailable.add(tearsheetId);
        setPptxAvailable(false);
      }
      emitErrorToast(next.title, next.message);
    },
    [pdfAvailable, tearsheetId],
  );

  const download = useCallback(
    (kind: GammaExportKind) => {
      if (pending) return;
      const loaded = kind === 'pdf' ? pdfBlobRef.current : null;
      if (loaded) {
        saveGammaExport(loaded, companyName, kind);
        return;
      }
      setPending(kind);
      downloadGammaExport(tearsheetId, kind, companyName)
        .catch((error: unknown) => report(error, kind))
        .finally(() => setPending(null));
    },
    [companyName, pending, report, tearsheetId],
  );

  const openInNewTab = useCallback(() => {
    if (pending) return;
    setPending('open');
    openGammaPdf(tearsheetId, { blobUrl: pdfUrl, companyName })
      .catch((error: unknown) => report(error, 'pdf'))
      .finally(() => setPending(null));
  }, [companyName, pdfUrl, pending, report, tearsheetId]);

  const retry = useCallback(() => {
    adoptPdf(null);
    pptxUnavailable.delete(tearsheetId);
    setPptxAvailable(true);
    setProblem(null);
    setAttempt((n) => n + 1);
  }, [adoptPdf, tearsheetId]);

  return {
    pdfUrl,
    loading,
    pdfAvailable,
    pptxAvailable,
    problem,
    pending,
    openInNewTab,
    download,
    retry,
  };
}
