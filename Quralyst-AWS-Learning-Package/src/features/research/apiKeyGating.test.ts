// preflightSubmitBlock (F8) — run needs ≥1 valid LLM key.
// isLastSelectedLlm / providerToForceSelect — ≥1 of OpenAI / Claude / Gemini must stay selected.
import { describe, it, expect } from 'vitest';
import { preflightSubmitBlock, isLastSelectedLlm, providerToForceSelect } from './apiKeyGating';
import type { TestResults, LlmProviderSelection } from './apiKeyGating';

const valid = { status: 'valid' as const };
const missing = { status: 'not_configured' as const };

describe('preflightSubmitBlock', () => {
  it('allows when an LLM key is valid', () => {
    const r: TestResults = { openai_api_key: valid };
    expect(preflightSubmitBlock(r, false)).toBe('');
  });

  it('allows via Anthropic or Gemini too (any LLM provider)', () => {
    expect(preflightSubmitBlock({ anthropic_api_key: valid }, false)).toBe('');
    expect(preflightSubmitBlock({ gemini_api_key: valid }, false)).toBe('');
  });

  it('blocks when no LLM key is valid', () => {
    const r: TestResults = { openai_api_key: missing, apollo_api_key: valid };
    const reason = preflightSubmitBlock(r, false);
    expect(reason).toMatch(/no valid llm provider key/i);
  });

  it('does not block while still verifying (button handles that separately)', () => {
    expect(preflightSubmitBlock({}, true)).toBe('');
  });

  it('blocks on empty results once verification is done', () => {
    expect(preflightSubmitBlock(undefined, false)).toMatch(/add one in settings/i);
  });
});

describe('isLastSelectedLlm', () => {
  it('locks whichever provider is the only one still selected', () => {
    expect(isLastSelectedLlm({ openai: true, anthropic: false, google: false }, 'openai')).toBe(
      true,
    );
    expect(isLastSelectedLlm({ openai: false, anthropic: true, google: false }, 'anthropic')).toBe(
      true,
    );
    expect(isLastSelectedLlm({ openai: false, anthropic: false, google: true }, 'google')).toBe(
      true,
    );
  });

  it('allows turning a provider off when another stays selected', () => {
    const two: LlmProviderSelection = { openai: true, anthropic: true, google: false };
    expect(isLastSelectedLlm(two, 'openai')).toBe(false);
    expect(isLastSelectedLlm(two, 'anthropic')).toBe(false);
  });

  it('does not lock an unselected provider', () => {
    expect(isLastSelectedLlm({ openai: true, anthropic: false, google: false }, 'google')).toBe(
      false,
    );
  });
});

describe('providerToForceSelect', () => {
  it('picks any usable provider when none are selected (openai preferred)', () => {
    const none: LlmProviderSelection = { openai: false, anthropic: false, google: false };
    expect(
      providerToForceSelect(
        { openai_api_key: valid, anthropic_api_key: valid, gemini_api_key: valid },
        none,
      ),
    ).toBe('openai');
  });

  it('falls through to the next usable provider when earlier keys are missing', () => {
    const none: LlmProviderSelection = { openai: false, anthropic: false, google: false };
    expect(
      providerToForceSelect(
        { openai_api_key: missing, anthropic_api_key: valid, gemini_api_key: valid },
        none,
      ),
    ).toBe('anthropic');
    expect(
      providerToForceSelect(
        { openai_api_key: missing, anthropic_api_key: missing, gemini_api_key: valid },
        none,
      ),
    ).toBe('google');
  });

  it('returns null when at least one usable provider is already selected', () => {
    const sel: LlmProviderSelection = { openai: false, anthropic: true, google: false };
    expect(providerToForceSelect({ anthropic_api_key: valid }, sel)).toBeNull();
  });
});
