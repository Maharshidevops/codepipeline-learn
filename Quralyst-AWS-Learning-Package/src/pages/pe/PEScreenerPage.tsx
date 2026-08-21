// PE Dataset — Screener page (F29.2). One page, four tabs (Find Similar | Holdings | Firms |
// People) over the whole PE dataset. UI styled to match QURALYST-20 Screener.tsx; tables override
// global tables.css under `.pes-page`. Tabs stay mounted so state is preserved across switches.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { peScreenerService } from '@/services/api';
import { peScreenerKeys } from '@/components/pe/screener/peScreenerKeys';
import HoldingsScreenerTab from '@/components/pe/screener/HoldingsScreenerTab';
import FirmsScreenerTab from '@/components/pe/screener/FirmsScreenerTab';
import PeopleScreenerTab from '@/components/pe/screener/PeopleScreenerTab';
import FindSimilarTab from '@/components/pe/screener/FindSimilarTab';
import HoldingsStatsHeader from '@/components/pe/screener/HoldingsStatsHeader';
import { paths } from '@/routes/paths';
import '@/styles/pages/pe-screener.css';

type Tab = 'similar' | 'holdings' | 'firms' | 'people';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'similar', label: 'Find Similar Firms', icon: 'bi-bullseye' },
  { id: 'holdings', label: 'Holdings', icon: 'bi-briefcase' },
  { id: 'firms', label: 'Firms', icon: 'bi-building' },
  { id: 'people', label: 'People', icon: 'bi-people' },
];

export default function PEScreenerPage() {
  const [tab, setTab] = useState<Tab>('similar');

  const { data: options } = useQuery({
    queryKey: peScreenerKeys.options,
    queryFn: () => peScreenerService.getOptions(),
    staleTime: 60_000,
  });

  return (
    <div className="pes-page">
      <header className="pes-header">
        <nav className="pes-header__crumb" aria-label="Breadcrumb">
          <Link to={paths.pe.firms}>Private Equity</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span>Screener</span>
        </nav>
        <h1 className="pes-header__title">Screener</h1>
        <p className="pes-header__sub">
          Find similar PE firms, or filter Holdings, Firms, and People across the database.
        </p>
      </header>

      <ul className="pes-tabs" role="tablist">
        {TABS.map((t) => (
          <li key={t.id} role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              // Keep accessible name "Find Similar" so /firms/i uniquely targets the Firms tab.
              aria-label={t.id === 'similar' ? 'Find Similar' : undefined}
              className={`pes-tabs__btn${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`bi ${t.icon}`} aria-hidden="true" />
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      <div role="tabpanel" data-testid="panel-similar" hidden={tab !== 'similar'}>
        <FindSimilarTab />
      </div>
      <div role="tabpanel" data-testid="panel-holdings" hidden={tab !== 'holdings'}>
        <HoldingsStatsHeader />
        <HoldingsScreenerTab options={options} />
      </div>
      <div role="tabpanel" data-testid="panel-firms" hidden={tab !== 'firms'}>
        <FirmsScreenerTab />
      </div>
      <div role="tabpanel" data-testid="panel-people" hidden={tab !== 'people'}>
        <PeopleScreenerTab />
      </div>
    </div>
  );
}
