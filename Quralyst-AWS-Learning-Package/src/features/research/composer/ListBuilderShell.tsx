// Shared List builder chrome — Replit Composer parity (header, deal bar, mode tabs).
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { paths } from '@/routes/paths';
import ComposerDealPicker from '@/features/research/composer/ComposerDealPicker';

export type ListBuilderMode = 'target' | 'strategic' | 'financial';

const MODES: {
  value: ListBuilderMode;
  label: string;
  to: string;
  blurb: string;
  icon: string;
}[] = [
  {
    value: 'target',
    label: 'Target list',
    to: paths.targetList,
    blurb: 'Discover, enrich, and score companies that match your ideal target profile.',
    icon: 'bi-bullseye',
  },
  {
    value: 'strategic',
    label: 'Strategic buyers',
    to: paths.strategic,
    blurb: 'Map potential acquirers by industry fit and strategic alignment.',
    icon: 'bi-people',
  },
  {
    value: 'financial',
    label: 'Financial buyers',
    to: paths.financialVerticals,
    blurb: 'Rank private-equity firms whose mandate fits your target on the numbers.',
    icon: 'bi-bar-chart',
  },
];

export interface ListBuilderShellProps {
  mode: ListBuilderMode;
  dealId: string;
  onDealChange: (dealId: string) => void;
  /** When true, deal came from ?deal= and should show locked banner instead of picker. */
  dealLocked?: boolean;
  dealName?: string;
  onDetachDeal?: () => void;
  children: ReactNode;
}

export default function ListBuilderShell({
  mode,
  dealId,
  onDealChange,
  dealLocked,
  dealName,
  onDetachDeal,
  children,
}: ListBuilderShellProps) {
  const active = MODES.find((m) => m.value === mode) ?? MODES[0];
  const dealSuffix = dealId ? `?deal=${encodeURIComponent(dealId)}` : '';

  return (
    <div className="lb-shell">
      <header className="lb-shell__header">
        <p className="lb-shell__eyebrow">Quralyst Research</p>
        <h1 className="lb-shell__title">List builder</h1>
        <p className="lb-shell__blurb">{active.blurb}</p>
      </header>

      {dealLocked && dealId ? (
        <div className="lb-deal-locked">
          <div className="lb-deal-locked__text">
            <i className="bi bi-briefcase" aria-hidden />
            <p>
              Saving this list under deal <strong>{dealName || '…'}</strong>
              <span className="text-muted">
                {' '}
                · grouped as research, companies are not added to the pipeline.
              </span>
            </p>
          </div>
          {onDetachDeal && (
            <button type="button" className="lb-deal-locked__detach" onClick={onDetachDeal}>
              <i className="bi bi-x-lg" aria-hidden /> Detach
            </button>
          )}
        </div>
      ) : (
        <ComposerDealPicker dealId={dealId} onChange={onDealChange} />
      )}

      <nav className="lb-mode-tabs" aria-label="List builder modes">
        {MODES.map((m) => (
          <NavLink
            key={m.value}
            to={
              m.to + (dealId && !dealLocked ? dealSuffix : dealLocked && dealId ? dealSuffix : '')
            }
            className={({ isActive }) =>
              `lb-mode-tabs__tab${isActive || m.value === mode ? ' is-active' : ''}`
            }
            end={m.value === 'target'}
          >
            <i className={`bi ${m.icon}`} aria-hidden />
            {m.label}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  );
}
