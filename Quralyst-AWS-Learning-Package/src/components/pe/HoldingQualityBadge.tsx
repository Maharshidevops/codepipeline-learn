// PE Holdings — data-quality badges (F24.3). Two surfaces:
//  • <RowQualityBadge> — the per-row summary from `quality.overallTier` + `hasIssue`
//    (rendered only when a present field is bad; a clean row shows nothing).
//  • <FieldQualityChips> — per-field tier + `reasons` chips for the suspect view + edit drawer.
import { Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import type { PEFieldQuality, PEHoldingQuality, PEOverallTier } from '@/types';

const OVERALL_TONE: Record<PEOverallTier, BadgeTone> = {
  valid: 'success',
  suspect: 'warning',
  invalid: 'danger',
};

const OVERALL_LABEL: Record<PEOverallTier, string> = {
  valid: 'Valid',
  suspect: 'Suspect',
  invalid: 'Invalid',
};

/** Row-level quality pill. Renders nothing when the row is clean (no present-field issue). */
export function RowQualityBadge({ quality }: { quality: PEHoldingQuality }) {
  if (!quality.hasIssue) return null;
  return (
    <Badge tone={OVERALL_TONE[quality.overallTier]}>{OVERALL_LABEL[quality.overallTier]}</Badge>
  );
}

const FIELD_TONE: Record<PEFieldQuality['tier'], BadgeTone> = {
  valid: 'success',
  suspect: 'warning',
  invalid: 'danger',
  missing: 'secondary',
};

/**
 * Per-field quality + reason chips. Renders nothing for `valid` fields; for
 * suspect/invalid/missing it shows a tier pill and one chip per `reason` (e.g. `no_tld`).
 */
export function FieldQualityChips({
  field,
  label,
}: {
  field: PEFieldQuality | undefined;
  label: string;
}) {
  if (!field || field.tier === 'valid') return null;
  return (
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      <Badge tone={FIELD_TONE[field.tier]}>
        {label}: {field.tier}
      </Badge>
      {field.reasons.map((reason) => (
        <span key={reason} className="badge bg-light text-dark border" data-testid="quality-reason">
          {reason}
        </span>
      ))}
    </span>
  );
}
