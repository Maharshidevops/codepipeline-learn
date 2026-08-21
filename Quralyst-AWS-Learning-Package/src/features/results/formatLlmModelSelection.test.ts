import { describe, it, expect } from 'vitest';
import { formatLlmModelSelection } from './formatLlmModelSelection';

describe('formatLlmModelSelection', () => {
  it('returns default when providers are missing or empty', () => {
    expect(formatLlmModelSelection(undefined)).toMatch(/default/i);
    expect(formatLlmModelSelection({})).toMatch(/default/i);
    expect(formatLlmModelSelection({ llmProviders: [] })).toMatch(/default/i);
  });

  it('returns default when all three providers are selected', () => {
    expect(
      formatLlmModelSelection({
        llmProviders: ['openai', 'anthropic', 'google'],
      }),
    ).toMatch(/default/i);
  });

  it('lists a single selected provider with fallback by default', () => {
    expect(formatLlmModelSelection({ llmProviders: ['google'] })).toBe(
      'Gemini (fallback to other models if selected models fail)',
    );
  });

  it('lists multiple selected providers', () => {
    expect(
      formatLlmModelSelection({
        llmProviders: ['openai', 'anthropic'],
        llmFallbackEnabled: true,
      }),
    ).toBe('OpenAI, Anthropic (fallback to other models if selected models fail)');
  });

  it('marks strict mode when fallback is off', () => {
    expect(
      formatLlmModelSelection({
        llmProviders: ['openai'],
        llmFallbackEnabled: false,
      }),
    ).toBe('OpenAI (strict — process stops if selected models fail)');
  });
});
