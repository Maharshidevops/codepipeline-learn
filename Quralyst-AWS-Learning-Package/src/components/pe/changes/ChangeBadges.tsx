// PE change-type badges (F31.2) — reusable pill for the activity feed. Colors follow Replit
// Changes.tsx (added=emerald, removed=rose, status_change=amber, field_change=purple). Labels match
// the Replit CHANGE_META vocabulary via changeMeta.ts.
import type { PEChangeType } from '@/types';
import { CHANGE_META } from './changeMeta';

const TONE_CLASS = {
  added: 'pea-badge--added',
  removed: 'pea-badge--removed',
  status: 'pea-badge--status',
  field: 'pea-badge--field',
} as const;

export function ChangeTypeBadge({
  changeType,
  className,
}: {
  changeType: PEChangeType;
  className?: string;
}) {
  const meta = CHANGE_META[changeType];
  return (
    <span
      className={`pea-badge ${TONE_CLASS[meta.tone]}${className ? ` ${className}` : ''}`}
      data-testid="change-type-badge"
      data-type={changeType}
    >
      {meta.label}
    </span>
  );
}
