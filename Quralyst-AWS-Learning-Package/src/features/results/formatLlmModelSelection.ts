// Human-readable summary of the AI model selection stored on a run's filters_applied.
// Ports utils/helpers.format_llm_model_selection + the previous_results.html JS helper.
import type { FiltersApplied } from '@/types';

const LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Gemini',
};

const DEFAULT_TEXT = 'Default (all models, automatic failover)';

/** Format llmProviders / llmFallbackEnabled from a result's filtersApplied. */
export function formatLlmModelSelection(
  filters: Pick<FiltersApplied, 'llmProviders' | 'llmFallbackEnabled'> | null | undefined,
): string {
  if (!filters) return DEFAULT_TEXT;

  const raw = filters.llmProviders;
  if (!raw || (Array.isArray(raw) && raw.length === 0)) return DEFAULT_TEXT;

  const list = (Array.isArray(raw) ? raw : [raw])
    .map((p) => String(p).trim().toLowerCase())
    .filter(Boolean);
  const providers = [...new Set(list)];

  if (!providers.length || providers.length === Object.keys(LABELS).length) {
    return DEFAULT_TEXT;
  }

  const names = providers.map((p) => LABELS[p] ?? p).join(', ');
  if (filters.llmFallbackEnabled ?? true) {
    return `${names} (fallback to other models if selected models fail)`;
  }
  return `${names} (strict — process stops if selected models fail)`;
}
