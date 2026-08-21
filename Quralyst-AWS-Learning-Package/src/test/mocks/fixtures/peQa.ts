// MSW fixtures for PE Ask-the-Market (F39.2).
import type { QaResponse } from '@/types';

export const mockQaAnswered: QaResponse = {
  answered: true,
  intent: 'Firms that exited industrial businesses recently.',
  answer:
    'Acme Capital [1] exited Widget Co and looks ready to redeploy. Beta Partners [2] also realized an industrial holding.',
  recordCount: 2,
  plan: {
    entity: 'holdings',
    filters: { sectors: ['Industrials'], status: 'realized' },
    limit: 25,
    enrich: ['acquisition_appetite'],
    sort: 'appetite',
    groupByFirm: true,
    intent: 'Firms that exited industrial businesses recently.',
  },
  citations: [
    {
      type: 'firm',
      id: 'pef1',
      label: 'Acme Capital',
      sublabel: 'PE Firm',
      href: '/pe/firms/pef1',
      detail: 'appetite: high',
      evidence: [
        {
          type: 'holding',
          id: 'h1',
          label: 'Widget Co',
          href: '/pe/firms/pef1?holding=h1',
          detail: 'exited 2025',
        },
      ],
    },
    {
      type: 'holding',
      id: 'h2',
      label: 'GearCo',
      sublabel: 'Beta Partners',
      href: '/pe/firms/pef2?holding=h2',
      detail: 'realized · Industrials',
    },
    {
      type: 'person',
      id: 'p1',
      label: 'Jane Partner',
      sublabel: 'Acme Capital',
      href: 'https://www.linkedin.com/in/jane-partner',
      detail: 'Partner',
    },
  ],
};

export const mockQaUnsupported: QaResponse = {
  answered: false,
  reason: 'That question needs live web data we do not store.',
};

export const mockQaEmpty: QaResponse = {
  answered: false,
  reason: 'No records in our dataset match that question.',
  intent: 'Current HVAC holdings in Antarctica',
  plan: {
    entity: 'holdings',
    filters: { sectors: ['HVAC'], geographies: ['Antarctica'], status: 'current' },
    limit: 25,
    enrich: [],
    sort: 'relevance',
    groupByFirm: false,
    intent: 'Current HVAC holdings in Antarctica',
  },
  citations: [],
  recordCount: 0,
};
