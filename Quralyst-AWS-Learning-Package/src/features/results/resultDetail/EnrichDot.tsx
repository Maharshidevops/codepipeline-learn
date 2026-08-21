import type { EnrichRowStatus } from '@/services/api';

export function EnrichDot({ status }: { status?: EnrichRowStatus | string }) {
  if (!status || status === 'pending' || status === 'skipped') return null;
  const cls =
    status === 'done'
      ? 'bg-success'
      : status === 'enriching'
        ? 'bg-primary'
        : status === 'failed'
          ? 'bg-danger'
          : 'bg-secondary';
  return (
    <span
      className={`d-inline-block rounded-circle ${cls}`}
      style={{ width: 8, height: 8 }}
      title={String(status)}
      aria-hidden
    />
  );
}
