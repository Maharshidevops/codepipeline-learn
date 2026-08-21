import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type { UsageLlmProviderRow, UsageTimeseriesPoint } from '@/types';
import { fmtDateShort, fmtNum } from '../format';

const INPUT_COLOR = '#818cf8';
const OUTPUT_COLOR = '#2dd4bf';

const LLM_SERIES = [
  { key: 'openai_api_key', label: 'OpenAI' },
  { key: 'anthropic_api_key', label: 'Claude' },
  { key: 'gemini_api_key', label: 'Gemini' },
  { key: 'perplexity_api_key', label: 'Perplexity' },
] as const;

function dayTokens(point: UsageTimeseriesPoint, key: string): number {
  const slot = point.llmTokens?.[key];
  if (!slot) return 0;
  return (slot.input ?? 0) + (slot.output ?? 0);
}

function sumSeriesTokens(
  series: UsageTimeseriesPoint[],
  key: string,
): { input: number; output: number } {
  let input = 0;
  let output = 0;
  for (const p of series) {
    const slot = p.llmTokens?.[key];
    if (!slot) continue;
    input += slot.input ?? 0;
    output += slot.output ?? 0;
  }
  return { input, output };
}

export function LlmTokenTrends({
  series,
  llmProviders = [],
  loading,
}: {
  series: UsageTimeseriesPoint[];
  llmProviders?: UsageLlmProviderRow[];
  loading: boolean;
}) {
  const chronological = useMemo(
    () => [...series].sort((a, b) => a.date.localeCompare(b.date)),
    [series],
  );

  const providerByKey = useMemo(() => {
    const map = new Map<string, UsageLlmProviderRow>();
    for (const p of llmProviders) map.set(p.key, p);
    return map;
  }, [llmProviders]);

  const hasAnyTokens =
    chronological.some((p) => LLM_SERIES.some((llm) => dayTokens(p, llm.key) > 0)) ||
    llmProviders.some((p) => (p.inputTokens ?? 0) + (p.outputTokens ?? 0) > 0);

  if (loading) {
    return (
      <div className="usage-llm-trends" data-testid="usage-llm-trends">
        <div className="usage-llm-trends-head">
          <h3 className="usage-card-title">LLM token trends</h3>
          <p className="usage-card-sub">Daily input + output tokens</p>
        </div>
        <div className="usage-llm-sparks">
          {LLM_SERIES.map((llm) => (
            <span key={llm.key} className="usage-skel" style={{ height: 72 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAnyTokens) {
    return (
      <div className="usage-llm-trends" data-testid="usage-llm-trends">
        <div className="usage-llm-trends-head">
          <h3 className="usage-card-title">LLM token trends</h3>
          <p className="usage-card-sub">Daily input + output tokens</p>
        </div>
        <p className="usage-llm-trends-empty">No LLM token activity in this period.</p>
      </div>
    );
  }

  return (
    <div className="usage-llm-trends" data-testid="usage-llm-trends">
      <div className="usage-llm-trends-head">
        <div className="usage-llm-trends-title-row">
          <div>
            <h3 className="usage-card-title">LLM token trends</h3>
            <p className="usage-card-sub">Daily input and output tokens</p>
          </div>
          <div className="usage-llm-legend" aria-hidden>
            <span className="usage-llm-legend-item">
              <span className="usage-llm-legend-swatch" style={{ background: INPUT_COLOR }} />
              Input
            </span>
            <span className="usage-llm-legend-item">
              <span className="usage-llm-legend-swatch" style={{ background: OUTPUT_COLOR }} />
              Output
            </span>
          </div>
        </div>
      </div>
      <div className="usage-llm-sparks" data-testid="usage-llm-tokens">
        {LLM_SERIES.map((llm) => {
          const data = chronological.map((p) => ({
            date: fmtDateShort(p.date),
            rawDate: p.date,
            tokens: dayTokens(p, llm.key),
            input: p.llmTokens?.[llm.key]?.input ?? 0,
            output: p.llmTokens?.[llm.key]?.output ?? 0,
          }));
          const fromSummary = providerByKey.get(llm.key);
          const fromSeries = sumSeriesTokens(chronological, llm.key);
          const input = fromSummary?.inputTokens ?? fromSeries.input;
          const output = fromSummary?.outputTokens ?? fromSeries.output;

          return (
            <div key={llm.key} className="usage-llm-spark" data-testid={`llm-spark-${llm.key}`}>
              <div className="usage-llm-spark-meta">
                <div>
                  <p className="usage-llm-spark-label">{llm.label}</p>
                  <p className="usage-llm-spark-total" data-testid={`llm-row-${llm.key}`}>
                    <span style={{ color: INPUT_COLOR }}>{fmtNum(input)} in</span>
                    {' · '}
                    <span style={{ color: OUTPUT_COLOR }}>{fmtNum(output)} out</span>
                  </p>
                </div>
              </div>
              <div className="usage-llm-spark-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 6, right: 2, left: 2, bottom: 2 }}>
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip
                      formatter={(value, name) => {
                        const n = Number(value);
                        if (name === 'input') return [fmtNum(n), 'Input'];
                        if (name === 'output') return [fmtNum(n), 'Output'];
                        return [fmtNum(n), String(name)];
                      }}
                      labelFormatter={(_label, payload) =>
                        payload?.[0]?.payload?.rawDate ?? String(_label)
                      }
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: '#1e2230',
                        color: '#e2e8f0',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="input"
                      name="input"
                      stroke={INPUT_COLOR}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="output"
                      name="output"
                      stroke={OUTPUT_COLOR}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
