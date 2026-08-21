import type { LucideIcon } from 'lucide-react';

export interface MetricDef {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  testId?: string;
  warn?: boolean;
}

export function MetricCards({ metrics, loading }: { metrics: MetricDef[]; loading: boolean }) {
  return (
    <div className="usage-metrics" data-testid="usage-summary-tiles">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className={`usage-metric-card${m.warn ? ' is-warn' : ''}`}
            data-testid={m.testId}
          >
            <div className="usage-metric-label">
              <Icon aria-hidden />
              {m.label}
            </div>
            <div className="usage-metric-value">{loading ? '…' : m.value}</div>
            <div className="usage-metric-sub">{m.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
