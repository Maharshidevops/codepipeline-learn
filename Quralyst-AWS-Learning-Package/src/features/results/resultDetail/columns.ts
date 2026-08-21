/** Fixed Target / Strategic column sets — Replit ResultDetail parity with legacy key fallbacks. */

import { cell } from './fitUtils';
import type { FixedCol, RowData } from './types';

function c(...keys: string[]): (row: RowData) => string {
  return (row) => cell(row, ...keys);
}

const BASE_CONTACT: FixedCol[] = [
  { label: 'Contact First Name', get: c('Contact First Name'), width: '130px' },
  { label: 'Contact Last Name', get: c('Contact Last Name'), width: '130px' },
  { label: 'Contact Title', get: c('Contact Title'), width: '150px' },
  { label: 'Contact Email', get: c('Contact Email'), kind: 'email', width: '170px' },
  { label: 'Contact Phone', get: c('Contact Phone'), width: '140px' },
  { label: 'Contact LinkedIn URL', get: c('Contact LinkedIn URL'), kind: 'link', width: '170px' },
  { label: 'Company Phone', get: c('Company Phone', 'Company Phone Number'), width: '140px' },
];

export const TARGET_COLUMNS: FixedCol[] = [
  { label: 'Company Name', get: c('Company Name', 'Company', 'company_name'), width: '170px' },
  { label: 'Business Description', get: c('Business Description'), width: '260px' },
  { label: 'Company Type', get: c('Company Type'), width: '130px' },
  { label: 'Sector', get: c('Sector'), width: '110px' },
  { label: 'Industry', get: c('Industry'), width: '110px' },
  { label: 'Website', get: c('Website'), kind: 'link', width: '150px' },
  {
    label: 'Company LinkedIn URL',
    get: c('Company LinkedIn URL', 'LinkedIn URL'),
    kind: 'link',
    width: '150px',
  },
  { label: 'LinkedIn Followers', get: c('LinkedIn Followers'), width: '120px' },
  { label: 'Revenue ($M)', get: c('Revenue ($M)', 'Revenue'), width: '110px' },
  { label: 'Employees', get: c('Employees', 'Number of Employees'), width: '100px' },
  { label: 'City', get: c('City'), width: '110px' },
  { label: 'State', get: c('State'), width: '90px' },
  { label: 'Country', get: c('Country'), width: '110px' },
  {
    label: 'Ultimate Corporate Parent',
    get: c('Ultimate Corporate Parent', 'Parent Company'),
    width: '170px',
  },
  { label: 'Owner Type', get: c('Owner Type'), width: '120px' },
  { label: 'Investors', get: c('Investors', 'Active Investors'), width: '150px' },
  { label: 'Google Rating', get: c('Google Rating', 'Rating'), width: '100px' },
  { label: 'Google Review Count', get: c('Google Review Count', 'Review Count'), width: '120px' },
  { label: 'Source Dataset', get: c('Source Dataset'), width: '130px' },
  { label: 'Fit/No Fit', get: c('Fit/No Fit', 'Fit Verdict', 'Fit'), width: '110px' },
  { label: 'Rationale', get: c('Rationale'), width: '260px' },
  { label: 'Total Score', get: c('Total Score', 'Score', 'Overall Score'), width: '100px' },
  { label: 'Business Fit', get: c('Business Fit', 'Business Fit Rationale'), width: '260px' },
  { label: 'Business Score', get: c('Business Score'), width: '110px' },
  { label: 'Size Fit Rationale', get: c('Size Fit Rationale'), width: '260px' },
  { label: 'Size Fit Score', get: c('Size Fit Score', 'Size Scores'), width: '110px' },
  { label: 'Geographic Fit Rationale', get: c('Geographic Fit Rationale'), width: '260px' },
  {
    label: 'Geographic Fit Score',
    get: c('Geographic Fit Score', 'Geography Score'),
    width: '110px',
  },
  { label: 'Acquisition Target Readiness', get: c('Acquisition Target Readiness'), width: '130px' },
  { label: 'Sell-side Mandate Readiness', get: c('Sell-side Mandate Readiness'), width: '130px' },
  ...BASE_CONTACT,
];

export const STRATEGIC_COLUMNS: FixedCol[] = [
  { label: 'Company Name', get: c('Company Name', 'Company', 'company_name'), width: '180px' },
  { label: 'Business Description', get: c('Business Description'), width: '260px' },
  { label: 'Company Type', get: c('Company Type'), width: '130px' },
  { label: 'Sector', get: c('Sector'), width: '110px' },
  { label: 'Industry', get: c('Industry'), width: '110px' },
  { label: 'Website', get: c('Website'), kind: 'link', width: '150px' },
  {
    label: 'Company LinkedIn URL',
    get: c('Company LinkedIn URL', 'LinkedIn URL'),
    kind: 'link',
    width: '150px',
  },
  { label: 'LinkedIn Followers', get: c('LinkedIn Followers'), width: '120px' },
  { label: 'Revenue ($M)', get: c('Revenue ($M)', 'Revenue'), width: '110px' },
  { label: 'Employees', get: c('Employees', 'Number of Employees'), width: '100px' },
  { label: 'City', get: c('City'), width: '110px' },
  { label: 'State', get: c('State'), width: '90px' },
  { label: 'Country', get: c('Country'), width: '110px' },
  {
    label: 'Ultimate Corporate Parent',
    get: c('Ultimate Corporate Parent', 'Parent Company'),
    width: '170px',
  },
  { label: 'Owner Type', get: c('Owner Type'), width: '120px' },
  { label: 'Investors', get: c('Investors', 'Active Investors'), width: '150px' },
  { label: 'Source Dataset', get: c('Source Dataset'), width: '130px' },
  { label: 'Strategic Buyer Propensity', get: c('Strategic Buyer Propensity'), width: '120px' },
  { label: 'Rationale', get: c('Rationale'), width: '260px' },
  { label: 'Total Score', get: c('Total Score', 'Score', 'Overall Score'), width: '100px' },
  { label: 'Business Fit', get: c('Business Fit', 'Business Fit Rationale'), width: '260px' },
  { label: 'Business Score', get: c('Business Score'), width: '110px' },
  { label: 'Size Fit Rationale', get: c('Size Fit Rationale'), width: '260px' },
  { label: 'Size Fit Score', get: c('Size Fit Score', 'Size Scores'), width: '110px' },
  { label: 'Geographic Fit Rationale', get: c('Geographic Fit Rationale'), width: '260px' },
  {
    label: 'Geographic Fit Score',
    get: c('Geographic Fit Score', 'Geography Score'),
    width: '110px',
  },
  ...BASE_CONTACT,
];

export const GMAPS_COLUMN_LABELS = new Set(['Google Rating', 'Google Review Count']);

export function resolveFixedColumns(
  sourceType: string | undefined,
  filtersApplied: Record<string, unknown> | undefined,
  rows: RowData[],
): FixedCol[] | null {
  const base =
    sourceType === 'strategic_buyer_list' || (sourceType || '').includes('strategic')
      ? STRATEGIC_COLUMNS
      : sourceType === 'target_list' || !sourceType
        ? TARGET_COLUMNS
        : null;
  if (!base) return null;

  const fa = filtersApplied ?? {};
  const gmapsEnabled = !!(fa.enableGmapsSearch ?? fa.enable_gmaps_search);
  const readinessDrop = new Set<string>();
  if (!(fa.acquisitionTargetReadiness ?? fa.acquisition_target_readiness)) {
    readinessDrop.add('Acquisition Target Readiness');
  }
  if (!(fa.sellSideMandateReadiness ?? fa.sell_side_mandate_readiness)) {
    readinessDrop.add('Sell-side Mandate Readiness');
  }

  const fixedLabels = new Set(base.map((col) => col.label));
  const knownExtras = new Set([
    ...fixedLabels,
    'Owner Name',
    'Ownership Acquired Date',
    'Company Acquired',
    'Company Acquisition Date',
    'News',
    'Acquisition News',
    'Review URL',
    'Score',
    'Number of Employees',
    'LinkedIn URL',
    'Parent Company',
    'Active Investors',
    'Company Phone Number',
    'Business Fit Rationale',
    'Size Scores',
    'Geography Score',
    'Rating',
    'Review Count',
    'Revenue',
    'Fit Verdict',
    'Fit',
    'Overall Score',
    'Company',
    'company_name',
  ]);

  const customLabels: string[] = [];
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!knownExtras.has(k) && !customLabels.includes(k) && cell(r, k)) {
        customLabels.push(k);
      }
    }
  }

  const customCols: FixedCol[] = customLabels.map((k) => ({
    label: k,
    get: (r) => cell(r, k),
    width: '160px',
  }));

  return [
    ...base.filter(
      (col) =>
        (gmapsEnabled || !GMAPS_COLUMN_LABELS.has(col.label)) && !readinessDrop.has(col.label),
    ),
    ...customCols,
  ];
}
