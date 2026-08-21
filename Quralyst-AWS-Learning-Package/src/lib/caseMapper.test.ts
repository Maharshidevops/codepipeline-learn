// caseMapper: recursive snake<->camel key transforms; idempotency; non-data values left untouched.
import { describe, it, expect } from 'vitest';
import { camelizeKeys, snakeizeKeys } from './caseMapper';

describe('camelizeKeys', () => {
  it('converts snake_case keys recursively (objects + arrays)', () => {
    const input = {
      per_page: 10,
      result_filename: 'a.xlsx',
      nested_obj: { created_at: '2024', owner_email: 'x@y.z' },
      list_items: [{ item_id: 1 }, { item_id: 2 }],
    };
    expect(camelizeKeys(input)).toEqual({
      perPage: 10,
      resultFilename: 'a.xlsx',
      nestedObj: { createdAt: '2024', ownerEmail: 'x@y.z' },
      listItems: [{ itemId: 1 }, { itemId: 2 }],
    });
  });

  it('is idempotent on already-camel keys', () => {
    const camel = { perPage: 10, nestedObj: { createdAt: '2024' } };
    expect(camelizeKeys(camel)).toEqual(camel);
  });

  it('leaves non-data values untouched', () => {
    expect(camelizeKeys('plain_string')).toBe('plain_string');
    expect(camelizeKeys(42)).toBe(42);
    expect(camelizeKeys(null)).toBe(null);
    const date = new Date(0);
    expect(camelizeKeys({ created_at: date })).toEqual({ createdAt: date });
  });
});

describe('snakeizeKeys', () => {
  it('converts camelCase keys recursively', () => {
    expect(snakeizeKeys({ perPage: 10, sortBy: 'newest', apiBaseUrl: '/api' })).toEqual({
      per_page: 10,
      sort_by: 'newest',
      api_base_url: '/api',
    });
  });

  it('round-trips with camelizeKeys', () => {
    const camel = { perPage: 1, nestedObj: { ownerEmail: 'a', listItems: [{ itemId: 9 }] } };
    expect(camelizeKeys(snakeizeKeys(camel))).toEqual(camel);
  });
});
