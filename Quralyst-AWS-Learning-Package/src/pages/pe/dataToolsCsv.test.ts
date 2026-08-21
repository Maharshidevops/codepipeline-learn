import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  BulkParseError,
  CSV_BOM,
  parseCsvBulk,
  parseExcelBuffer,
  rowsToCsv,
  sampleCsvForTool,
} from '@/pages/pe/dataToolsCsv';

describe('dataToolsCsv file parsers', () => {
  it('parses CSV url bulk with header aliases', () => {
    const csv = 'name,location,description\nAcme,NY,Widgets\nBeta,,\n';
    expect(parseCsvBulk(csv, 'url')).toEqual([
      { companyName: 'Acme', location: 'NY', description: 'Widgets' },
      { companyName: 'Beta' },
    ]);
  });

  it('parses PE and GICS CSV formats', () => {
    expect(parseCsvBulk('portfolioCompany,peFirm\nCo,Firm\n', 'pe')).toEqual([
      { portfolioCompany: 'Co', peFirm: 'Firm' },
    ]);
    expect(parseCsvBulk('portfolioCompany,peFirm,lookupType\nCo,Firm,investment\n', 'pe')).toEqual([
      { portfolioCompany: 'Co', peFirm: 'Firm', lookupType: 'investment' },
    ]);
    expect(
      parseCsvBulk(
        'companyName,description,productsServices,keywords,website\nCo,Desc,Prod,"hr, saas",https://co.example\n',
        'gics',
      ),
    ).toEqual([
      {
        companyName: 'Co',
        description: 'Desc',
        productsServices: 'Prod',
        keywords: ['hr', 'saas'],
        website: 'https://co.example',
      },
    ]);
  });

  it('parses location CSV and quoted commas', () => {
    const csv = 'companyName,website\n"Acme, Inc.",https://acme.com\n';
    expect(parseCsvBulk(csv, 'location')).toEqual([
      { companyName: 'Acme, Inc.', website: 'https://acme.com' },
    ]);
  });

  it('throws when required headers are missing', () => {
    expect(() => parseCsvBulk('foo,bar\n1,2\n', 'pe')).toThrow(BulkParseError);
  });

  it('parses Excel buffer for pe tool', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['portfolioCompany', 'peFirm'],
      ['Medline', 'Blackstone'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    expect(parseExcelBuffer(buf, 'pe')).toEqual([
      { portfolioCompany: 'Medline', peFirm: 'Blackstone' },
    ]);
  });

  it('builds multi-row demo csv and export with BOM', () => {
    const sample = sampleCsvForTool('pe');
    expect(sample).toContain('portfolioCompany,peFirm,lookupType');
    expect(sample.split('\n').length).toBeGreaterThan(2);
    expect(sampleCsvForTool('url')).toContain('companyName,location,description');
    expect(sampleCsvForTool('location')).toContain('companyName,website');
    expect(sampleCsvForTool('gics')).toContain('keywords');
    expect(sampleCsvForTool('gics')).toContain('website');
    const csv = CSV_BOM + rowsToCsv(['a', 'b'], [{ a: '1', b: 'x,y' }]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain('"x,y"');
  });
});
