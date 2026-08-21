// normalizeApiError: status-based messages, short plain server text passthrough, HTML/JSON skip.
import { describe, it, expect } from 'vitest';
import { normalizeApiError } from './normalizeApiError';

describe('normalizeApiError', () => {
  it('maps 401 without server text to session-expired', () => {
    expect(normalizeApiError({ status: 401, message: '' })).toMatch(/session has expired/i);
  });

  it('surfaces short 401 server text when present', () => {
    expect(normalizeApiError({ status: 401, message: 'Invalid credentials' })).toBe(
      'Invalid credentials',
    );
  });

  it('surfaces a short, plain server message', () => {
    expect(normalizeApiError({ status: 400, message: 'Email already in use.' })).toBe(
      'Email already in use.',
    );
  });

  it('surfaces the server message for 429 rate limits', () => {
    expect(
      normalizeApiError({
        status: 429,
        message: 'Too many password changes. Please try again after 24 hours.',
      }),
    ).toBe('Too many password changes. Please try again after 24 hours.');
  });

  it('falls back to a status message for HTML/JSON bodies', () => {
    expect(normalizeApiError({ status: 500, message: '<!doctype html><html>...' })).toMatch(
      /our end/i,
    );
    expect(normalizeApiError({ status: 500, message: '{"detail":"x"}' })).toMatch(/our end/i);
  });

  it('uses a generic message for unknown shapes', () => {
    expect(normalizeApiError('boom')).toMatch(/something went wrong/i);
    expect(normalizeApiError(null)).toMatch(/something went wrong/i);
    expect(normalizeApiError(new Error('plain error'))).toBe('plain error');
  });
});
