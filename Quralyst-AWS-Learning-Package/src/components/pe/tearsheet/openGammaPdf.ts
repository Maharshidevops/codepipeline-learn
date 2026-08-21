// Helpers for the polished Gamma export (PDF / PPTX).
//
// `gamma.pdf` / `gamma.pptx` answer with the JSON error envelope instead of a file when the export
// was never produced (404), the upstream Gamma link has expired (410) or the proxy fetch failed
// (502). A tab or an `<a download>` pointed straight at them would therefore show the raw envelope
// or save a broken file, so callers fetch the bytes and render `describeGammaExportError` instead.
import { peTearsheetService } from '@/services/api';
import type { ApiError } from '@/types';

export type GammaExportKind = 'pdf' | 'pptx';

export interface GammaExportProblem {
  status: number;
  /** Short headline for the banner / toast. */
  title: string;
  /** The backend's own explanation, e.g. the expired-link message. */
  message: string;
  /** A Gamma-only re-render from the stored dossier is enough to fix this. */
  canRegenerate: boolean;
}

const GENERIC_MESSAGE = 'Could not load the polished tearsheet file. Please try again.';

function kindLabel(kind: GammaExportKind): string {
  return kind === 'pdf' ? 'PDF' : 'PowerPoint';
}

/**
 * Upstream failures arrive with the provider's status glued on ("Gamma PPTX export request failed
 * (401)"). The number means nothing to the reader, so it never reaches the screen.
 */
function withoutStatusCodes(text: string): string {
  return text
    .replace(/\s*[([]\s*(?:HTTP\s*)?[1-5]\d\d\s*[)\]]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Turns a failed export fetch into copy the UI can show, plus whether a re-render would fix it. */
export function describeGammaExportError(
  error: unknown,
  kind: GammaExportKind = 'pdf',
): GammaExportProblem {
  const apiError = (error ?? {}) as Partial<ApiError>;
  const status = apiError.statusCode ?? apiError.status ?? 0;
  const serverMessage =
    typeof apiError.message === 'string' ? withoutStatusCodes(apiError.message) : '';
  const message = serverMessage || GENERIC_MESSAGE;
  const label = kindLabel(kind);

  if (status === 410) {
    return { status, title: `This polished ${label} has expired`, message, canRegenerate: true };
  }
  if (status === 404) {
    return { status, title: `No polished ${label} available`, message, canRegenerate: true };
  }
  if (status >= 500) {
    return { status, title: `Couldn't load the polished ${label}`, message, canRegenerate: true };
  }
  return { status, title: `Couldn't load the polished ${label}`, message, canRegenerate: false };
}

/** Object URL for a fetched export, or null outside a browser (jsdom has no createObjectURL). */
export function objectUrlFor(blob: Blob): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string | null): void {
  if (!url) return;
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  URL.revokeObjectURL(url);
}

export function gammaExportFilename(companyName: string, kind: GammaExportKind): string {
  const base =
    (companyName ?? '')
      .trim()
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'tearsheet';
  return `${base}_Tearsheet.${kind}`;
}

/** Fetches the export bytes. Rejects with `ApiError` (410 expired, 404 missing, …) on failure. */
export function fetchGammaExport(tearsheetId: string, kind: GammaExportKind): Promise<Blob> {
  return kind === 'pdf'
    ? peTearsheetService.gammaPdfBlob(tearsheetId)
    : peTearsheetService.gammaPptxBlob(tearsheetId);
}

/** Saves already-fetched export bytes, so a pre-loaded PDF downloads without a second round-trip. */
export function saveGammaExport(blob: Blob, companyName: string, kind: GammaExportKind): void {
  saveBlob(blob, gammaExportFilename(companyName, kind));
}

function saveBlob(blob: Blob, filename: string): void {
  const url = objectUrlFor(blob);
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  revokeObjectUrl(url);
}

/** Downloads the polished export. Rejects with `ApiError` so the caller can report it. */
export async function downloadGammaExport(
  tearsheetId: string,
  kind: GammaExportKind,
  companyName: string,
): Promise<void> {
  const blob = await fetchGammaExport(tearsheetId, kind);
  saveBlob(blob, gammaExportFilename(companyName, kind));
}

function writePlaceholder(tab: Window): void {
  try {
    tab.document.write(
      '<title>Preparing tearsheet PDF…</title>' +
        '<body style="margin:0;display:grid;place-items:center;height:100vh;' +
        'font:15px system-ui,sans-serif;color:#475569">Preparing the polished PDF…</body>',
    );
    tab.document.close();
  } catch {
    /* placeholder copy is cosmetic — a blank tab is still fine */
  }
}

/**
 * Opens the polished PDF in its own tab. Pass `blobUrl` when the bytes are already in hand.
 * Otherwise the tab is opened synchronously (so the popup blocker still sees the click) and
 * pointed at the blob once it arrives — and closed again if the fetch fails, so the user reads
 * the error in the app rather than a tab full of JSON.
 */
export async function openGammaPdf(
  tearsheetId: string,
  { blobUrl, companyName = '' }: { blobUrl?: string | null; companyName?: string } = {},
): Promise<void> {
  if (blobUrl) {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // No `noopener` here: the handle is needed to navigate the tab to the blob once it loads.
  const tab = window.open('', '_blank');
  if (tab) writePlaceholder(tab);

  try {
    const blob = await fetchGammaExport(tearsheetId, 'pdf');
    const url = objectUrlFor(blob);
    if (!url) {
      tab?.close();
      return;
    }
    if (tab) tab.location.href = url;
    // Popup blocked — a save is the next best thing to losing the click entirely.
    else saveBlob(blob, gammaExportFilename(companyName, 'pdf'));
  } catch (error) {
    tab?.close();
    throw error;
  }
}
