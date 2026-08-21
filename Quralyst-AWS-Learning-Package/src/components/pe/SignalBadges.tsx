// PE signal badges (F30.2) — reusable pills mirroring the reference SignalBadges.tsx, adapted to this
// repo's Bootstrap-class convention + the shared Tooltip primitive (CSS hover popover, role="tooltip").
// Drop-in for the Exit Watch table, the firm-detail signals tab, and later phases (F38/F40).
//  • <ReadinessChip> — per-holding "likely to come to market" indicator. Tier-colored, score inline,
//    reasons listed in a tooltip. Renders NOTHING for tier "n/a".
//  • <AppetiteBadge> — per-firm "how actively is this firm hunting" indicator (high/moderate/low/dormant).
import { Tooltip } from '@/components/ui';
import type { PEAppetiteTier, PEReadinessTier } from '@/types';

// Tier → Bootstrap contextual background/text classes. Colors escalate with tier.
const READINESS_CLASS: Record<PEReadinessTier, string> = {
  elevated: 'sig-chip sig-chip--elevated',
  watch: 'sig-chip sig-chip--watch',
  low: 'sig-chip sig-chip--low',
  'n/a': 'sig-chip sig-chip--na',
};

const READINESS_LABEL: Record<PEReadinessTier, string> = {
  elevated: 'Exit likely',
  watch: 'Watch',
  low: 'Low',
  'n/a': '—',
};

const PILL_CLASS = 'd-inline-flex align-items-center gap-1 fw-semibold';

// Tooltip content is rendered inside a <span> (the shared Tooltip's .tooltip-text), so we use inline
// spans (not a <ul>) to keep the markup valid — one reason per line via a block display.
function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <span className="d-block text-start small">
      {reasons.map((r, i) => (
        <span key={i} className="d-block">
          • {r}
        </span>
      ))}
    </span>
  );
}

export function ReadinessChip({
  tier,
  score,
  reasons,
  className,
}: {
  tier: PEReadinessTier;
  score?: number;
  reasons?: string[];
  className?: string;
}) {
  // Non-applicable holdings render nothing (parity with the reference).
  if (tier === 'n/a') return null;
  const pill = (
    <span
      className={`${PILL_CLASS} ${READINESS_CLASS[tier]}${className ? ` ${className}` : ''}`}
      data-testid="readiness-chip"
      data-tier={tier}
    >
      {READINESS_LABEL[tier]}
      {typeof score === 'number' && <span className="opacity-75">{score}</span>}
    </span>
  );
  if (!reasons?.length) return pill;
  return <Tooltip content={<ReasonList reasons={reasons} />}>{pill}</Tooltip>;
}

const APPETITE_CLASS: Record<PEAppetiteTier, string> = {
  high: 'sig-chip sig-chip--high',
  moderate: 'sig-chip sig-chip--moderate',
  low: 'sig-chip sig-chip--low',
  dormant: 'sig-chip sig-chip--dormant',
};

const APPETITE_LABEL: Record<PEAppetiteTier, string> = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  dormant: 'Dormant',
};

export function AppetiteBadge({
  tier,
  score,
  reasons,
  className,
}: {
  tier: PEAppetiteTier;
  score?: number;
  reasons?: string[];
  className?: string;
}) {
  const pill = (
    <span
      className={`${PILL_CLASS} ${APPETITE_CLASS[tier]}${className ? ` ${className}` : ''}`}
      data-testid="appetite-badge"
      data-tier={tier}
    >
      {APPETITE_LABEL[tier]}
      {typeof score === 'number' && <span className="opacity-75">{score}</span>}
    </span>
  );
  if (!reasons?.length) return pill;
  return <Tooltip content={<ReasonList reasons={reasons} />}>{pill}</Tooltip>;
}
