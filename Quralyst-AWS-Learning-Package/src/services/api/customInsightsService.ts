// Custom Insights (Tier A / A14 / F13) — system preset questions for the insights wizard step.
// The user sees only the label; the backend swaps in the full question at the LLM call.
import { http } from '../http';
import { endpoints } from '../endpoints';

export interface InsightPreset {
  id: string;
  label: string;
}

export interface CustomInsightsService {
  getPresets(): Promise<InsightPreset[]>;
}

export const customInsightsService: CustomInsightsService = {
  getPresets: async () => {
    const data = await http<{ presets: InsightPreset[] }>(endpoints.customInsights.presets);
    return data.presets ?? [];
  },
};
