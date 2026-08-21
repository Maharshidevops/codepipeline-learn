// Composer deal picker — horizontal bar matching Replit List builder.
import { useEffect, useState } from 'react';
import { dealsService, type Deal } from '@/services/api';

export interface ComposerDealPickerProps {
  dealId: string;
  onChange: (dealId: string) => void;
}

export default function ComposerDealPicker({ dealId, onChange }: ComposerDealPickerProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    dealsService
      .list('active')
      .then((rows) => {
        if (active) setDeals(rows ?? []);
      })
      .catch(() => {
        if (active) setDeals([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="lb-deal-bar">
      <div className="lb-deal-bar__label">
        <i className="bi bi-briefcase" aria-hidden />
        <label htmlFor="composer-deal-picker">
          Run under a deal <span className="text-muted">(optional)</span>
        </label>
      </div>
      <select
        id="composer-deal-picker"
        className="lb-deal-bar__select"
        value={dealId}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Run under a deal"
      >
        <option value="">{loading ? 'Loading deals…' : 'No deal (standalone list)'}</option>
        {deals.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {dealId && (
        <span className="lb-deal-bar__hint">
          Grouped as research, companies are not added to the pipeline.
        </span>
      )}
    </div>
  );
}
