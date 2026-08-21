// Presentational primitives for the PE Analysis Dashboard (F32.2).
// QURALYST-20 Analysis.tsx card chrome → pean-* CSS (no global Bootstrap table styles).
import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui';
import type { PERecentKind } from '@/types';

/** A titled card with a one-line description echoing the active window/segment. */
export function AnalysisCard({
  title,
  description,
  action,
  loading,
  isEmpty,
  children,
  testId,
  icon,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  loading: boolean;
  isEmpty: boolean;
  children: ReactNode;
  testId?: string;
  icon?: string;
}) {
  return (
    <section className="pean-card" data-testid={testId}>
      <div className="pean-card__head">
        <h2 className="pean-card__title">
          {icon && <i className={icon} aria-hidden="true" />}
          {title}
        </h2>
        {action}
      </div>
      <p className="pean-card__desc">{description}</p>
      {loading ? (
        <div className="pean-card__loading">
          <Spinner />
        </div>
      ) : isEmpty ? (
        <div className="pean-card__empty">No data for this window/segment yet.</div>
      ) : (
        children
      )}
    </section>
  );
}

const KIND_CLASS: Record<PERecentKind, string> = {
  invested: 'pean-kind pean-kind--invested',
  exited: 'pean-kind pean-kind--exited',
};

const KIND_LABEL: Record<PERecentKind, string> = {
  invested: 'Invested',
  exited: 'Exited',
};

/** invested/exited pill for the recent-by-sector transaction lists. */
export function KindChip({ kind }: { kind: PERecentKind }) {
  return (
    <span className={KIND_CLASS[kind]} data-testid="kind-chip" data-kind={kind}>
      {KIND_LABEL[kind]}
    </span>
  );
}
