// PE Dataset — Intelligence Digest (F37.2).
// Visual 1:1 with QURALYST-20 Digest.tsx (no news embed — that lives on /pe/news).
// Contract: REF-API-CONTRACT.md §PE Dataset — Digest.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { DigestEventRow } from '@/components/pe/digest/DigestEventRow';
import { CATEGORY_META, DIGEST_WINDOWS, CategoryIcon } from '@/components/pe/digest/digestMeta';
import { peDigestKeys } from '@/components/pe/digest/peDigestKeys';
import { peDigestService } from '@/services/api';
import type { DigestWindow } from '@/types';
import '@/styles/pages/digest.css';

const VALID = new Set(DIGEST_WINDOWS.map((w) => w.value));

function parseWindow(raw: string | null): DigestWindow {
  if (raw && VALID.has(raw as DigestWindow)) return raw as DigestWindow;
  return '7d';
}

function DigestSkeleton() {
  return (
    <div className="digest-card" role="status" aria-label="Loading digest">
      <div className="digest-skel-list">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="digest-skel-row">
            <div className="digest-skel-avatar" />
            <div className="digest-skel-lines">
              <div className="digest-skel-line digest-skel-line--sm" />
              <div className="digest-skel-line digest-skel-line--md" />
              <div className="digest-skel-line digest-skel-line--xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PEDigestPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const windowParam = parseWindow(searchParams.get('window'));

  function setWindow(next: DigestWindow) {
    const params = new URLSearchParams(searchParams);
    if (next === '7d') params.delete('window');
    else params.set('window', next);
    setSearchParams(params);
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: peDigestKeys.window(windowParam),
    queryFn: () => peDigestService.getDigest(windowParam),
    staleTime: 60_000,
  });

  const total = data?.totalEvents ?? 0;
  const topEvents = data?.topEvents ?? [];
  const groups = useMemo(() => (data?.groups ?? []).filter((g) => g.count > 0), [data?.groups]);
  const windowLabel = DIGEST_WINDOWS.find((o) => o.value === windowParam)?.label ?? windowParam;
  const activeCategories = groups.length;

  return (
    <div className="digest-page">
      <div className="digest-header">
        <div className="digest-header__text">
          <div className="digest-crumb">
            <span>Private Equity</span>
            <i className="bi bi-chevron-right" aria-hidden />
            <span className="digest-crumb__current">Digest</span>
          </div>
          <h1 className="digest-title">Intelligence Digest</h1>
          <p className="digest-subtitle">
            The most important moves across the dataset, ranked and explained — exits, new
            investments, roll-ups, and partner moves.
          </p>
        </div>
        <button
          type="button"
          className="digest-refresh-btn"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh digest"
        >
          {isFetching ? <Spinner size="sm" /> : <i className="bi bi-arrow-clockwise" aria-hidden />}
          Refresh
        </button>
      </div>

      <div className="digest-window-tabs" role="group" aria-label="Digest window">
        {DIGEST_WINDOWS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`digest-window-tab${windowParam === o.value ? ' is-active' : ''}`}
            onClick={() => setWindow(o.value)}
            aria-pressed={windowParam === o.value}
            data-testid={`digest-window-${o.value}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <DigestSkeleton />
      ) : total === 0 ? (
        <div className="digest-empty" data-testid="digest-empty">
          <div className="digest-empty-icon" aria-hidden>
            <i className="bi bi-info-circle" />
          </div>
          <div>
            <p className="digest-empty-title">No activity in this window</p>
            <p className="digest-empty-hint">
              Try a longer time window, or check back after the next scrape runs.
            </p>
          </div>
        </div>
      ) : (
        <div className="digest-feed">
          <div className="digest-banner" data-testid="digest-banner">
            <span className="digest-banner-icon" aria-hidden>
              <i className="bi bi-stars" />
            </span>
            <p className="mb-0">
              <strong>{windowLabel}</strong>
              <span className="digest-banner-muted">
                {' '}
                — {total.toLocaleString()} notable event{total === 1 ? '' : 's'} across{' '}
                {activeCategories} categor{activeCategories === 1 ? 'y' : 'ies'}
              </span>
            </p>
          </div>

          {topEvents.length > 0 ? (
            <div>
              <div className="digest-section-title">
                <i className="bi bi-fire digest-section-icon" aria-hidden />
                <span>Top stories</span>
              </div>
              <div className="digest-card" data-testid="digest-top-events">
                <div className="digest-card__content">
                  {topEvents.map((ev, i) => (
                    <DigestEventRow key={ev.id} event={ev} rank={i + 1} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {groups.map((g) => {
            const meta = CATEGORY_META[g.category];
            return (
              <div key={g.category} data-testid={`digest-group-${g.category}`}>
                <div className="digest-group-header">
                  <CategoryIcon category={g.category} />
                  <span className="digest-group-label">{g.label ?? meta.label}</span>
                  <span className="digest-group-divider" aria-hidden />
                  <span className="digest-group-count">
                    {g.count.toLocaleString()} event{g.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="digest-card">
                  <div className="digest-card__content">
                    {g.events.map((ev) => (
                      <DigestEventRow key={ev.id} event={ev} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
