export const bdScoringKeys = {
  all: ['bd-scoring'] as const,
  templates: (filters?: { targetUserType?: string; scoringDirection?: string }) =>
    [...bdScoringKeys.all, 'templates', filters ?? {}] as const,
  companies: (templateId: string, filters: Record<string, string>) =>
    [...bdScoringKeys.all, 'companies', templateId, filters] as const,
  contexts: (templateId: string) => [...bdScoringKeys.all, 'contexts', templateId] as const,
  benchmarks: () => [...bdScoringKeys.all, 'benchmarks'] as const,
};
