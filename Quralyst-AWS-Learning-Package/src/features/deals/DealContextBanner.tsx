// Deal context banner (Tier B / F19; fills the F15 placeholder slot) — shown atop a research wizard
// when it was opened "for a deal" (?deal=<id>). Confirms which deal the run will link to and whether
// the criteria came from the deal's brief. Fetching the deal name is best-effort — a missing/forbidden
// deal just renders nothing (the run still links server-side, which fail-closes on access).
import { useEffect, useState } from 'react';
import { dealsService, type Deal } from '@/services/api';

export default function DealContextBanner({
  dealId,
  fromBrief = false,
}: {
  dealId: string;
  fromBrief?: boolean;
}) {
  const [deal, setDeal] = useState<Deal | null>(null);

  useEffect(() => {
    let active = true;
    dealsService
      .get(dealId)
      .then((d) => {
        if (active) setDeal(d);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [dealId]);

  if (!deal) return null;

  return (
    <div className="alert alert-info d-flex align-items-center gap-2 mb-3" role="status">
      <i className="bi bi-briefcase-fill" aria-hidden="true" />
      <div>
        Running research for deal <strong>{deal.name}</strong>. The resulting list will be linked to
        this deal.
        {fromBrief && ' Criteria were prefilled from the deal brief — review before running.'}
      </div>
    </div>
  );
}
