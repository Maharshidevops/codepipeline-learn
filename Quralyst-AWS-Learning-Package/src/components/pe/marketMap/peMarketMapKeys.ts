import type { MarketMapSegment } from '@/types';

export const peMarketMapKeys = {
  all: ['pe', 'market-map'] as const,
  options: () => [...peMarketMapKeys.all, 'options'] as const,
  buyers: (q: { sector: string; geo?: string; segment?: string }) =>
    [...peMarketMapKeys.all, 'buyers', q] as const,
  whitespace: (q: { segment?: string; sector?: string; minActivity?: number; limit?: number }) =>
    [...peMarketMapKeys.all, 'whitespace', q] as const,
};

export const MARKET_MAP_SEGMENTS: { value: MarketMapSegment | ''; label: string }[] = [
  { value: '', label: 'All sizes' },
  { value: 'lower-middle-market', label: 'Lower middle market' },
  { value: 'middle-market', label: 'Middle market' },
  { value: 'upper-middle-market', label: 'Upper middle market' },
];

export const MARKET_MAP_BAND_LABELS: Record<MarketMapSegment, string> = {
  'lower-middle-market': 'Lower middle market',
  'middle-market': 'Middle market',
  'upper-middle-market': 'Upper middle market',
};

/** CSS intensity bucket for whitespaceScore (no chart lib). */
export function whitespaceIntensityClass(score: number): string {
  if (score >= 60) return 'mm-heat-high';
  if (score >= 30) return 'mm-heat-mid';
  if (score > 0) return 'mm-heat-low';
  return 'mm-heat-none';
}
