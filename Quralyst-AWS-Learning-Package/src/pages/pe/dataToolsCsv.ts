/** Bulk file parsers (CSV/Excel) + CSV builders for PE Data Tools (F42.3). */

import * as XLSX from 'xlsx';

export type DataToolBulkKind = 'url' | 'pe' | 'location' | 'gics';

export type UrlBulkItem = {
  companyName: string;
  location?: string;
  description?: string;
};
export type PeBulkItem = {
  portfolioCompany: string;
  peFirm: string;
  lookupType?: string;
};
export type LocationBulkItem = { companyName: string; website?: string };
export type GicsBulkItem = {
  companyName: string;
  description?: string;
  productsServices?: string;
  keywords?: string[];
  website?: string;
};
export type BulkItem = UrlBulkItem | PeBulkItem | LocationBulkItem | GicsBulkItem;

export class BulkParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkParseError';
  }
}

const PE_LOOKUP_TYPES = new Set(['investment', 'exit', 'status', 'profile', 'combined']);

/** Canonical field → accepted header aliases (normalized). */
const FIELD_ALIASES: Record<string, string[]> = {
  companyName: ['companyname', 'company', 'company_name', 'name', 'company name'],
  location: ['location', 'loc', 'hq', 'headquarters'],
  description: ['description', 'desc', 'companydescription', 'company description'],
  portfolioCompany: [
    'portfoliocompany',
    'portfolio_company',
    'portfolio company',
    'company',
    'companyname',
    'company name',
    'name',
  ],
  peFirm: ['pefirm', 'pe_firm', 'pe firm', 'firm', 'firmname', 'firm name', 'pe'],
  lookupType: ['lookuptype', 'lookup_type', 'lookup type', 'type', 'lookup'],
  website: ['website', 'url', 'web', 'site', 'websiteurl', 'website url'],
  productsServices: [
    'productsservices',
    'products_services',
    'products services',
    'products',
    'services',
  ],
  keywords: ['keywords', 'keyword', 'tags', 'keywordslist', 'keywords list'],
};

/** Bulk columns mirror single-shot forms — required + the same optional detail fields. */
const TOOL_FIELDS: Record<
  DataToolBulkKind,
  { required: string[]; optional: string[]; sampleHeaders: string[] }
> = {
  url: {
    required: ['companyName'],
    optional: ['location', 'description'],
    sampleHeaders: ['companyName', 'location', 'description'],
  },
  pe: {
    required: ['portfolioCompany', 'peFirm'],
    optional: ['lookupType'],
    sampleHeaders: ['portfolioCompany', 'peFirm', 'lookupType'],
  },
  location: {
    required: ['companyName'],
    optional: ['website'],
    sampleHeaders: ['companyName', 'website'],
  },
  gics: {
    required: ['companyName'],
    optional: ['description', 'productsServices', 'keywords', 'website'],
    sampleHeaders: ['companyName', 'description', 'productsServices', 'keywords', 'website'],
  },
};

function parseKeywordsCell(raw: string): string[] | undefined {
  const parts = raw
    .split(/[;,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function normalizeLookupType(raw: string): string | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  return PE_LOOKUP_TYPES.has(v) ? v : undefined;
}

function normHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}

function resolveField(header: string, candidates: string[]): string | null {
  const n = normHeader(header);
  const compact = n.replace(/\s+/g, '');
  for (const field of candidates) {
    const aliases = FIELD_ALIASES[field] || [field.toLowerCase()];
    for (const a of aliases) {
      const aa = a.replace(/\s+/g, '');
      if (n === a || compact === aa) return field;
    }
  }
  return null;
}

/** RFC4180-ish CSV line splitter (handles quoted commas/newlines via full parse). */
export function parseCsvText(text: string): string[][] {
  const raw = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  while (i < raw.length) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(cell.trim());
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && raw[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      cell = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

function mapHeaderIndexes(headers: string[], kind: DataToolBulkKind): Record<string, number> {
  const conf = TOOL_FIELDS[kind];
  const candidates = [...conf.required, ...conf.optional];
  const map: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const field = resolveField(h, candidates);
    if (field && map[field] === undefined) map[field] = idx;
  });
  const missing = conf.required.filter((f) => map[f] === undefined);
  if (missing.length) {
    throw new BulkParseError(
      `Missing required column(s): ${missing.join(', ')}. Expected headers: ${conf.sampleHeaders.join(', ')}`,
    );
  }
  return map;
}

function rowsFromMatrix(matrix: string[][], kind: DataToolBulkKind): BulkItem[] {
  if (matrix.length < 2) {
    throw new BulkParseError('File must include a header row and at least one data row.');
  }
  const headers = matrix[0];
  const col = mapHeaderIndexes(headers, kind);
  const items: BulkItem[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const get = (field: string) => {
      const idx = col[field];
      if (idx === undefined) return '';
      return (cells[idx] ?? '').trim();
    };

    if (kind === 'url') {
      const companyName = get('companyName');
      if (!companyName) continue;
      const location = get('location');
      const description = get('description');
      items.push({
        companyName,
        ...(location ? { location } : {}),
        ...(description ? { description } : {}),
      });
    } else if (kind === 'pe') {
      const portfolioCompany = get('portfolioCompany');
      const peFirm = get('peFirm');
      if (!portfolioCompany || !peFirm) continue;
      const lookupType = normalizeLookupType(get('lookupType'));
      items.push({
        portfolioCompany,
        peFirm,
        ...(lookupType ? { lookupType } : {}),
      });
    } else if (kind === 'location') {
      const companyName = get('companyName');
      if (!companyName) continue;
      const website = get('website');
      items.push({ companyName, ...(website ? { website } : {}) });
    } else {
      const companyName = get('companyName');
      if (!companyName) continue;
      const description = get('description');
      const productsServices = get('productsServices');
      const keywords = parseKeywordsCell(get('keywords'));
      const website = get('website');
      items.push({
        companyName,
        ...(description ? { description } : {}),
        ...(productsServices ? { productsServices } : {}),
        ...(keywords ? { keywords } : {}),
        ...(website ? { website } : {}),
      });
    }
  }

  if (!items.length) {
    throw new BulkParseError('No valid data rows found after the header.');
  }
  return items;
}

export function parseCsvBulk(text: string, kind: DataToolBulkKind): BulkItem[] {
  return rowsFromMatrix(parseCsvText(text), kind);
}

export function parseExcelBuffer(buf: ArrayBuffer, kind: DataToolBulkKind): BulkItem[] {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new BulkParseError('Excel file has no sheets.');
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];
  const normalized = matrix.map((row) =>
    (Array.isArray(row) ? row : []).map((c) => String(c ?? '').trim()),
  );
  return rowsFromMatrix(normalized, kind);
}

export async function parseBulkFile(file: File, kind: DataToolBulkKind): Promise<BulkItem[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await readFileAsText(file);
    return parseCsvBulk(text, kind);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await readFileAsArrayBuffer(file);
    return parseExcelBuffer(buf, kind);
  }
  throw new BulkParseError('Unsupported file type. Upload a .csv, .xlsx, or .xls file.');
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function bulkColumnsHint(kind: DataToolBulkKind): string {
  const conf = TOOL_FIELDS[kind];
  const optional = conf.optional.length ? ` (optional: ${conf.optional.join(', ')})` : '';
  return `${conf.required.join(', ')}${optional}`;
}

export function sampleCsvForTool(kind: DataToolBulkKind): string {
  const headers = TOOL_FIELDS[kind].sampleHeaders;
  return rowsToCsv(headers, sampleCsvRows(kind));
}

export function sampleCsvRows(kind: DataToolBulkKind): Record<string, string>[] {
  const examples: Record<DataToolBulkKind, Record<string, string>[]> = {
    url: [
      {
        companyName: 'Acme Corp',
        location: 'New York, NY',
        description: 'B2B software company',
      },
      {
        companyName: "Crain's Chicago Business",
        location: 'Chicago, IL',
        description: 'Business news publisher',
      },
      {
        companyName: 'Homes.com',
        location: 'Santa Clara, CA',
        description: 'Online real estate marketplace',
      },
    ],
    pe: [
      {
        portfolioCompany: 'Medline Industries',
        peFirm: 'Blackstone',
        lookupType: 'combined',
      },
      {
        portfolioCompany: 'PetSmart',
        peFirm: 'BC Partners',
        lookupType: 'investment',
      },
      {
        portfolioCompany: 'Citrix',
        peFirm: 'Elliott Investment Management',
        lookupType: 'exit',
      },
    ],
    location: [
      { companyName: 'Acme Corp', website: 'https://acme.example.com' },
      { companyName: 'Homes.com', website: 'https://www.homes.com' },
      { companyName: '@properties', website: 'https://www.atproperties.com' },
    ],
    gics: [
      {
        companyName: 'Acme Corp',
        description: 'Cloud HR software for mid-market employers',
        productsServices: 'SaaS, HRIS',
        keywords: 'HR, payroll, benefits',
        website: 'https://acme.example.com',
      },
      {
        companyName: 'Medline Industries',
        description: 'Medical supplies distributor',
        productsServices: 'Healthcare products',
        keywords: 'medical, distribution',
        website: 'https://www.medline.com',
      },
      {
        companyName: 'Homes.com',
        description: 'Online real estate listings platform',
        productsServices: 'Marketplace, PropTech',
        keywords: 'real estate, listings',
        website: 'https://www.homes.com',
      },
    ],
  };
  return examples[kind];
}

export function sampleCsvFilename(kind: DataToolBulkKind): string {
  return `data-tools-${kind}-demo.csv`;
}

export function downloadSampleCsv(kind: DataToolBulkKind, filename?: string) {
  const csv = CSV_BOM + sampleCsvForTool(kind);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || sampleCsvFilename(kind);
  a.click();
  URL.revokeObjectURL(a.href);
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(cols: string[], rows: Record<string, unknown>[]): string {
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

export const URL_CSV_COLS = ['companyName', 'url', 'confidence', 'status', 'errorMessage'];
export const PE_CSV_COLS = [
  'portfolioCompany',
  'peFirm',
  'lookupType',
  'investmentYear',
  'investmentYearEvidence',
  'estimatedInvestmentYear',
  'holdingStatusScore',
  'exitYear',
  'exitYearEvidence',
  'currentStatus',
  'dealType',
  'confidence',
  'status',
  'errorMessage',
  'source',
  'website',
  'description',
  'locationText',
];
export const LOC_CSV_COLS = [
  'companyName',
  'city',
  'stateRegion',
  'country',
  'confidence',
  'status',
  'errorMessage',
  'source',
];
export const GICS_CSV_COLS = [
  'companyName',
  'sectorCode',
  'sectorName',
  'industryGroupCode',
  'industryGroupName',
  'industryCode',
  'industryName',
  'subIndustryCode',
  'subIndustryName',
  'confidence',
  'status',
  'errorMessage',
];

export function csvColsForJobType(jobType: string): string[] {
  if (jobType === 'pe_lookup') return PE_CSV_COLS;
  if (jobType === 'location') return LOC_CSV_COLS;
  if (jobType === 'gics_classify') return GICS_CSV_COLS;
  return URL_CSV_COLS;
}

/** UTF-8 BOM prefix for Excel-friendly CSV. */
export const CSV_BOM = '\uFEFF';
