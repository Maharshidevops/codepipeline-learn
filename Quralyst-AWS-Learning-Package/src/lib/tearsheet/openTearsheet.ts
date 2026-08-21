// Navigate to the PE Tearsheet page for a company (F40.2).
import { paths } from '@/routes/paths';

export function buildTearsheetPath(companyName: string, website?: string, slide?: number): string {
  const params = new URLSearchParams({ company: companyName });
  if (website?.trim()) params.set('website', website.trim());
  if (slide != null && Number.isFinite(slide)) params.set('slide', String(slide));
  return `${paths.pe.tearsheet}?${params.toString()}`;
}

/** Returns the tearsheet URL path + query string. */
export function openTearsheet(companyName: string, website?: string): string {
  return buildTearsheetPath(companyName, website);
}

/** Full-page polished viewer (no app sidebar). */
export function buildTearsheetViewerPath(tearsheetId: string): string {
  return paths.pe.tearsheetView(tearsheetId);
}

/** Open the polished tearsheet viewer in a dedicated browser tab. */
export function openTearsheetViewer(tearsheetId: string): Window | null {
  return window.open(buildTearsheetViewerPath(tearsheetId), '_blank', 'noopener,noreferrer');
}
