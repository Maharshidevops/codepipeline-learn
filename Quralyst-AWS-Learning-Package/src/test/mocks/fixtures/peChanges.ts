// PE Activity Feed / Changes fixtures (F31.2) — mirror the backend contract shapes exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Changes).
// Used by the changes MSW handlers + the page test. Covers:
//  • an `added` row and a `status_change` row (old→new) with a live holdingId (holding deep link);
//  • a `removed` row whose delete was APPLIED → holdingId=null (companyName renders as plain text);
//  • a `removed` row that still carries a holdingId (deep link present);
//  • a `field_change` row with a `fieldName` (the type has no chip yet, but the row must still render);
//  • a summary `byType` bundle whose counts match the row set.
import type { PEChangeRow, PEChangesSummary } from '@/types';

// Rows are in reverse-chronological order (newest first) — the feed renders them in this order.
export const mockChangeRows: PEChangeRow[] = [
  {
    id: 'chg-added-1',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    holdingId: 'h-add-1',
    companyName: 'Helio Robotics',
    changeType: 'added',
    fieldName: null,
    oldValue: null,
    newValue: null,
    detectedAt: '2026-07-12T14:30:00Z',
    scrapeJobId: 'job-501',
  },
  {
    id: 'chg-status-1',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    holdingId: 'h-status-1',
    companyName: 'Beacon Analytics',
    changeType: 'status_change',
    fieldName: null,
    oldValue: 'current',
    newValue: 'exited',
    detectedAt: '2026-07-11T09:15:00Z',
    scrapeJobId: 'job-498',
  },
  {
    // Removal whose delete was APPLIED — holdingId is null → companyName renders as plain text.
    id: 'chg-removed-null',
    firmId: 'pef2',
    firmName: 'Thoma Bravo',
    holdingId: null,
    companyName: 'Cobalt Logistics',
    changeType: 'removed',
    fieldName: null,
    oldValue: null,
    newValue: null,
    detectedAt: '2026-07-10T18:45:00Z',
    scrapeJobId: 'job-490',
  },
  {
    // Removal still carrying a holdingId — the holding deep link is present.
    id: 'chg-removed-linked',
    firmId: 'pef2',
    firmName: 'Thoma Bravo',
    holdingId: 'h-rem-2',
    companyName: 'Delta Foods',
    changeType: 'removed',
    fieldName: null,
    oldValue: null,
    newValue: null,
    detectedAt: '2026-07-09T12:00:00Z',
    scrapeJobId: 'job-487',
  },
  {
    // field_change — no chip yet, but the row renders with the fieldName + old→new.
    id: 'chg-field-1',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    holdingId: 'h-field-1',
    companyName: 'Zenith Health',
    changeType: 'field_change',
    fieldName: 'sector',
    oldValue: 'Healthcare',
    newValue: 'Healthcare IT',
    detectedAt: '2026-07-08T08:20:00Z',
    scrapeJobId: 'job-480',
  },
];

// Summary byType — counts match the row set above (added:1, removed:2, status_change:1, field_change:1).
export const mockChangesSummary: PEChangesSummary = {
  byType: [
    { changeType: 'added', count: 1 },
    { changeType: 'removed', count: 2 },
    { changeType: 'status_change', count: 1 },
    { changeType: 'field_change', count: 1 },
  ],
  total: 5,
};
