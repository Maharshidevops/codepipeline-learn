// Cost breakdown tooltip for tearsheet generation (F40.2).
import type { TearsheetCost } from '@/types';

export function formatCostBadgeTotal(cost: TearsheetCost): string {
  const base = cost.knownTotalUsd.toFixed(4);
  return cost.hasUnknown ? `Est. $${base}+` : `Est. $${base}`;
}

export function formatCostLineAmount(costUsd: number | null): string {
  return costUsd == null ? 'plan-based' : `$${costUsd.toFixed(4)}`;
}

export function CostTooltip({ cost }: { cost: TearsheetCost }) {
  return (
    <div className="tearsheet-cost position-relative" data-testid="tearsheet-cost">
      <button
        type="button"
        className="btn btn-sm border-0 fw-semibold px-3 py-1"
        style={{
          background: '#ecfdf5',
          color: '#047857',
          borderRadius: 999,
          fontSize: 12,
          lineHeight: 1.4,
        }}
        title={`Estimated generation cost as of ${new Date(cost.computedAt).toLocaleString()}`}
        data-testid="tearsheet-cost-badge"
        aria-describedby="tearsheet-cost-popover"
      >
        {formatCostBadgeTotal(cost)}
      </button>
      <div
        id="tearsheet-cost-popover"
        className="tearsheet-cost-popover position-absolute end-0 mt-1 p-3 border rounded-3 shadow"
        style={{
          width: 300,
          zIndex: 30,
          background: '#ffffff',
          color: '#0f172a',
          borderColor: '#e2e8f0',
        }}
        data-testid="tearsheet-cost-popover"
        role="tooltip"
      >
        <div className="fw-semibold small mb-2" style={{ color: '#0f172a' }}>
          Cost breakdown
        </div>
        <ul className="list-unstyled small mb-2">
          {cost.lines.map((line, i) => (
            <li key={i} className="d-flex justify-content-between gap-2 mb-1">
              <span className="text-truncate" style={{ color: '#64748b' }} title={line.detail}>
                {line.label}
              </span>
              <span
                className="fw-medium text-nowrap"
                style={{ color: '#0f172a' }}
                data-testid="tearsheet-cost-line"
              >
                {formatCostLineAmount(line.costUsd)}
              </span>
            </li>
          ))}
        </ul>
        <div
          className="d-flex justify-content-between border-top pt-2 small fw-semibold"
          style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
        >
          <span>Known total</span>
          <span data-testid="tearsheet-cost-total">${cost.knownTotalUsd.toFixed(4)}</span>
        </div>
        {cost.hasUnknown ? (
          <p className="small mb-0 mt-2" style={{ color: '#64748b' }}>
            Plus plan-dependent Coresignal credits (not priced).
          </p>
        ) : null}
      </div>
      <style>{`
        .tearsheet-cost-popover { display: none; }
        .tearsheet-cost:hover .tearsheet-cost-popover,
        .tearsheet-cost:focus-within .tearsheet-cost-popover {
          display: block;
        }
      `}</style>
    </div>
  );
}
