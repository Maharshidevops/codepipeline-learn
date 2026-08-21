import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { UsageLlmProviderRow, UsageTimeseriesPoint } from '@/types';
import { fmtDateShort, fmtNum } from '../format';
import { LlmTokenTrends } from './LlmTokenTrends';

const BRAND = '#818cf8';

export function CostChart({
  series,
  llmProviders = [],
  loading,
  fetching = false,
}: {
  series: UsageTimeseriesPoint[];
  llmProviders?: UsageLlmProviderRow[];
  loading: boolean;
  fetching?: boolean;
}) {
  // Chart left→right oldest→newest
  const chronological = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = chronological.map((p) => ({
    date: fmtDateShort(p.date),
    cost: p.costUsd,
    calls: p.calls,
    rawDate: p.date,
  }));

  return (
    <div className={`usage-card${fetching ? ' is-fetching' : ''}`} data-testid="usage-timeseries">
      {fetching ? (
        <div className="usage-fetch-overlay" aria-live="polite" aria-busy="true">
          <span className="usage-fetch-spinner" />
          Updating…
        </div>
      ) : null}
      <div className="usage-card-header">
        <div>
          <h2 className="usage-card-title">Daily activity</h2>
          <p className="usage-card-sub">Estimated API cost per day</p>
        </div>
      </div>
      <div className="usage-card-body">
        {loading ? (
          <span className="usage-skel" style={{ height: 180, width: '100%' }} />
        ) : chartData.length === 0 ? (
          <div className="usage-chart-empty">No activity in this period.</div>
        ) : (
          <div className="usage-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={14}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255, 255, 255, 0.12)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#cbd5e1' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#cbd5e1' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${Number(v).toFixed(2)}`}
                  width={48}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value);
                    if (name === 'cost') return [`$${n.toFixed(4)}`, 'Est. cost'];
                    return [fmtNum(n), 'API calls'];
                  }}
                  labelFormatter={(_label, payload) => {
                    const raw = payload?.[0]?.payload?.rawDate;
                    return raw ?? String(_label);
                  }}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#1e2230',
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="cost" fill={BRAND} radius={[3, 3, 0, 0]} name="cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <LlmTokenTrends series={series} llmProviders={llmProviders} loading={loading} />
    </div>
  );
}
