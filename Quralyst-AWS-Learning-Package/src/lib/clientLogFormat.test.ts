// Phase 40 — formatter for the dev terminal bridge line.
import { describe, it, expect } from 'vitest';
import { formatClientLog } from './clientLogFormat';

describe('formatClientLog', () => {
  it('renders API request/response entries as a compact request line', () => {
    const line = formatClientLog({
      level: 'info',
      message: 'api request',
      fields: {
        method: 'GET',
        path: '/api/pe/firms/options',
        status: 200,
        ms: 42,
        requestId: 'abc12345-6789-0000',
      },
    });
    expect(line).toBe('[client INFO ] GET /api/pe/firms/options → 200 (42ms) [req abc12345]');
  });

  it('renders a failed API entry at its level, no requestId needed', () => {
    const line = formatClientLog({
      level: 'error',
      message: 'api request failed',
      fields: { method: 'POST', path: '/api/pe/firms', status: 400, ms: 7 },
    });
    expect(line).toBe('[client ERROR] POST /api/pe/firms → 400 (7ms)');
  });

  it('renders non-API entries as level + message + key=value fields', () => {
    const line = formatClientLog({
      level: 'error',
      message: 'error toast',
      fields: { source: 'query', status: 400, message: 'The request was invalid.' },
    });
    expect(line).toBe(
      '[client ERROR] error toast source=query status=400 message="The request was invalid."',
    );
  });

  it('pads shorter levels so lines align, and defaults level to INFO', () => {
    expect(formatClientLog({ level: 'warn', message: 'x' })).toBe('[client WARN ] x');
    expect(formatClientLog({ message: 'boot' })).toBe('[client INFO ] boot');
  });

  it('includes the route and omits empty fields', () => {
    expect(
      formatClientLog({ level: 'info', route: '/pe/holdings', message: 'm', fields: {} }),
    ).toBe('[client INFO ] /pe/holdings m');
  });

  it('truncates over-long field values and never throws on non-serialisable fields', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(formatClientLog({ level: 'error', message: 'oops', fields: circular })).toBe(
      '[client ERROR] oops self=[unserializable]',
    );

    const long = 'x'.repeat(500);
    const line = formatClientLog({ level: 'info', message: 'big', fields: { blob: long } });
    expect(line.endsWith('…')).toBe(true);
    expect(line.length).toBeLessThan(260);
  });
});
