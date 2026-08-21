/** Fit bucket helpers for Target / Strategic Result Detail (Replit ResultDetail parity). */

export type FitBucket = 'fit' | 'partial' | 'no';

export const FIT_META: Record<FitBucket, { label: string; className: string }> = {
  fit: { label: 'Fit', className: 'rd-fit-badge rd-fit-badge--fit' },
  partial: { label: 'Partial', className: 'rd-fit-badge rd-fit-badge--partial' },
  no: { label: 'No fit', className: 'rd-fit-badge rd-fit-badge--no' },
};

export function fitValue(row: Record<string, string>): string {
  return String(
    row['Fit/No Fit'] || row['Fit Verdict'] || row['Fit Status'] || row.fit_no_fit || row.Fit || '',
  ).trim();
}

export function fitBucket(row: Record<string, string>): FitBucket {
  const v = fitValue(row).toLowerCase();
  if (v.includes('partial') || v.includes('maybe')) return 'partial';
  if (v.includes('no') || v.includes('insufficient')) return 'no';
  if (v.includes('fit') || v.includes('yes')) return 'fit';
  const score = parseScore(row);
  if (score >= 7) return 'fit';
  if (score >= 4) return 'partial';
  return 'no';
}

export function parseScore(row: Record<string, string>): number {
  const raw =
    row['Total Score'] ||
    row['Overall Score'] ||
    row['Final Score'] ||
    row['GPT Score'] ||
    row.Score ||
    row.score ||
    '';
  const n = parseFloat(String(raw).replace(/[% ,]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function companyNameOf(row: Record<string, string>): string {
  return String(
    row['Company Name'] ||
      row['PE Firm name'] ||
      row['Firm Name'] ||
      row['PE Firm'] ||
      row.Company ||
      row.company_name ||
      '',
  ).trim();
}

export function rowStr(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '' && String(v).toLowerCase() !== 'nan') {
      return String(v);
    }
  }
  return '';
}
