// PE Dataset — Activity Feed / Changes (F31.2).
// Port of Replit QURALYST-20/artifacts/pe-scraper/src/pages/Changes.tsx.
import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Select } from '@/components/ui';
import { ChangeItem } from '@/components/pe/changes/ChangeItem';
import { CHANGE_META, CHANGE_TYPE_OPTIONS, groupByDate } from '@/components/pe/changes/changeMeta';
import { peChangesKeys } from '@/components/pe/changes/peChangesKeys';
import { peChangesService, peService } from '@/services/api';
import type { PEChangeRow, PEChangeType, PEChangeTypeFilter } from '@/types';
import '@/styles/pages/pe-activity.css';

const PAGE_LIMIT = 100;

const TYPE_FILTER_VALUES: PEChangeTypeFilter[] = CHANGE_TYPE_OPTIONS.map((o) => o.value);

function countByType(rows: PEChangeRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.changeType] = (acc[row.changeType] ?? 0) + 1;
    return acc;
  }, {});
}

function buildPulseParts(typeCounts: Record<string, number>): string[] {
  const parts: string[] = [];
  const added = typeCounts.added ?? 0;
  const removed = typeCounts.removed ?? 0;
  const statusChange = typeCounts.status_change ?? 0;
  const fieldChange = typeCounts.field_change ?? 0;
  if (added) parts.push(`${added} new portfolio addition${added !== 1 ? 's' : ''}`);
  if (removed) parts.push(`${removed} exit${removed !== 1 ? 's' : ''} detected`);
  if (statusChange) parts.push(`${statusChange} status change${statusChange !== 1 ? 's' : ''}`);
  if (fieldChange) parts.push(`${fieldChange} field update${fieldChange !== 1 ? 's' : ''}`);
  return parts;
}

function SkelRow() {
  return (
    <div className="pea-skel-row">
      <span className="pea-skel pea-skel--circle" />
      <div className="pea-skel-lines">
        <span className="pea-skel" style={{ width: '33%', height: 14 }} />
        <span className="pea-skel" style={{ width: '66%', height: 12 }} />
        <span className="pea-skel" style={{ width: '25%', height: 12 }} />
      </div>
    </div>
  );
}

export default function PEChangesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const typeParam = (searchParams.get('type') ?? 'all') as PEChangeTypeFilter;
  const type: PEChangeTypeFilter = TYPE_FILTER_VALUES.includes(typeParam) ? typeParam : 'all';
  const firmId = searchParams.get('firmId') ?? '';

  function setFilter(next: { type?: PEChangeTypeFilter; firmId?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.type !== undefined) {
      if (next.type === 'all') params.delete('type');
      else params.set('type', next.type);
    }
    if (next.firmId !== undefined) {
      if (!next.firmId) params.delete('firmId');
      else params.set('firmId', next.firmId);
    }
    setSearchParams(params);
  }

  function toggleTypePill(pillType: PEChangeType) {
    setFilter({ type: type === pillType ? 'all' : pillType });
  }

  const { data: firmsData } = useQuery({
    queryKey: ['pe', 'firms', 'options'],
    queryFn: () => peService.listFirmOptions(),
    staleTime: 60_000,
  });

  const firmOptions = useMemo(
    () =>
      (firmsData ?? [])
        .map((f) => ({ value: f.id, label: f.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [firmsData],
  );

  const filters = { type, firmId: firmId || undefined };
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isFetching } =
    useInfiniteQuery({
      queryKey: peChangesKeys.list(filters),
      queryFn: ({ pageParam }) =>
        peChangesService.listChanges({ ...filters, limit: PAGE_LIMIT, offset: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((n, p) => n + p.changes.length, 0);
        return loaded < lastPage.total ? loaded : undefined;
      },
      staleTime: 60_000,
    });

  const rows = useMemo(() => data?.pages.flatMap((p) => p.changes) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const grouped = useMemo(() => groupByDate(rows), [rows]);
  const typeCounts = useMemo(() => countByType(rows), [rows]);
  const pulseParts = useMemo(() => buildPulseParts(typeCounts), [typeCounts]);

  const typeSelectOptions = useMemo(
    () => CHANGE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  const firmSelectOptions = useMemo(
    () => [{ value: 'all', label: 'All firms' }, ...firmOptions],
    [firmOptions],
  );

  return (
    <div className="pea-page">
      <div className="pea-header">
        <div className="pea-header__copy">
          <h1 className="pea-title">Activity Feed</h1>
          <p className="pea-subtitle">
            Changes observed on PE firm portfolio websites — new additions, exits, and status
            updates. Excludes enrichment from third-party data sources.
          </p>
        </div>
        <button
          type="button"
          className="pea-refresh"
          onClick={() => void refetch()}
          disabled={isFetching && !isFetchingNextPage}
          aria-label="Refresh activity feed"
        >
          <i
            className={`bi bi-arrow-clockwise${isFetching && !isFetchingNextPage ? ' pea-refresh__spin' : ''}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      {rows.length > 0 && (
        <div className="pea-pulse" data-testid="summary-cards">
          <span className="pea-pulse__dot" aria-hidden="true" />
          <p className="pea-pulse__text">
            <strong>Market Pulse</strong>
            {pulseParts.length > 0 && (
              <span className="pea-pulse__detail">
                {' '}
                — {pulseParts.join(', ')} across{' '}
                <span data-testid="summary-total">{total.toLocaleString()}</span> tracked events
              </span>
            )}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="pea-pills" role="group" aria-label="Filter by change type">
          {(Object.keys(CHANGE_META) as PEChangeType[]).map((changeType) => {
            const count = typeCounts[changeType] ?? 0;
            if (!count) return null;
            const meta = CHANGE_META[changeType];
            const active = type === changeType;
            return (
              <button
                key={changeType}
                type="button"
                className={`pea-pill pea-pill--${meta.tone}${active ? ' is-active' : ''}`}
                aria-pressed={active}
                data-testid={`summary-${changeType}`}
                onClick={() => toggleTypePill(changeType)}
              >
                <i className={`bi ${meta.icon}`} aria-hidden="true" />
                {meta.label}
                <span className="pea-pill__count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="pea-filters">
        <Select
          value={type}
          onChange={(v) => setFilter({ type: v as PEChangeTypeFilter })}
          options={typeSelectOptions}
          aria-label="Filter by type"
          className="pea-filter pea-filter--type"
          buttonClassName="pea-filter__trigger"
        />
        <Select
          value={firmId || 'all'}
          onChange={(v) => setFilter({ firmId: v === 'all' ? '' : v })}
          options={firmSelectOptions}
          aria-label="Filter by firm"
          className="pea-filter pea-filter--firm"
          buttonClassName="pea-filter__trigger"
        />
      </div>

      {isLoading ? (
        <div className="pea-card" aria-busy="true" aria-label="Loading activity">
          <div className="pea-skel-list">
            {Array.from({ length: 8 }, (_, i) => (
              <SkelRow key={i} />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="pea-empty">
          <div className="pea-empty__icon" aria-hidden="true">
            <i className="bi bi-info-circle" />
          </div>
          <p className="pea-empty__title">No changes recorded yet</p>
          <p className="pea-empty__hint">
            Changes will appear here after the next scheduled or manual scrape runs.
          </p>
        </div>
      ) : (
        <div className="pea-feed">
          {grouped.map(([date, dayChanges]) => (
            <div key={date} className="pea-day">
              <div className="pea-day__header">
                <span className="pea-day__label">{date}</span>
                <div className="pea-day__divider" />
                <span className="pea-day__count">
                  {dayChanges.length} change{dayChanges.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="pea-card">
                {dayChanges.map((c) => (
                  <ChangeItem key={c.id} change={c} />
                ))}
              </div>
            </div>
          ))}

          {hasNextPage && (
            <div className="pea-load-more">
              <button
                type="button"
                className="pea-load-more__btn"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? 'Loading…'
                  : `Load more (${(total - rows.length).toLocaleString()} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
