// Deals list — card grid + status tabs + create modal (QURALYST-20 parity).
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { dealsService, type Deal, type DealStatus } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import CreateDealModal from '@/features/deals/CreateDealModal';
import '@/styles/pages/deals.css';

type StatusFilter = DealStatus | 'all';

function DealTypeBadge({ type }: { type: Deal['dealType'] }) {
  const sell = type === 'sell_side';
  return (
    <span className={`deal-type-badge ${sell ? 'deal-type-badge--sell' : 'deal-type-badge--buy'}`}>
      {sell ? 'Sell-Side' : 'Buy-Side'}
    </span>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const navigate = useNavigate();
  const summary = deal.pipelineSummary ?? [];
  const stageCount = deal.stages?.length ?? 0;
  const memberCount = deal.members?.length ?? 0;

  return (
    <button
      type="button"
      className="deal-card"
      onClick={() => navigate(paths.dealWorkspace(deal.id))}
    >
      <div className="deal-card__top">
        <div className="min-w-0">
          <h3 className="deal-card__name">{deal.name}</h3>
          {deal.description ? <p className="deal-card__desc">{deal.description}</p> : null}
        </div>
        <div className="deal-card__badges">
          <DealTypeBadge type={deal.dealType} />
          {deal.status === 'archived' && (
            <span className="deal-archived-badge">
              <i className="bi bi-archive" aria-hidden="true" /> Archived
            </span>
          )}
        </div>
      </div>

      <div className="deal-card__meta">
        <span>
          {stageCount} stage{stageCount === 1 ? '' : 's'}
        </span>
        <span>
          {memberCount} member{memberCount === 1 ? '' : 's'}
        </span>
        {deal.yourRole === 'lead' && <span>You lead</span>}
      </div>

      {summary.length > 0 && (
        <div className="deal-card__chips">
          {[...deal.stages]
            .sort((a, b) => a.order - b.order)
            .map((stage) => {
              const count = summary.find((p) => p.stageId === stage.stageId)?.count ?? 0;
              if (count === 0) return null;
              return (
                <div key={stage.stageId} className="deal-stage-chip">
                  <span
                    className="deal-stage-dot"
                    style={stage.color ? { backgroundColor: stage.color } : undefined}
                  />
                  {stage.name}: {count}
                </div>
              );
            })}
        </div>
      )}

      {deal.createdAt && (
        <div className="deal-card__footer">
          Created {new Date(deal.createdAt).toLocaleDateString()}
        </div>
      )}
    </button>
  );
}

export default function DealsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('active');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all when filter is "all"; otherwise server-side status filter.
      const rows = await dealsService.list(filter === 'all' ? 'all' : filter);
      setDeals(rows);
    } catch {
      toast.error('Failed to load deals.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div className="content-wrapper deals-page">
      <div className="deals-header">
        <div>
          <h1 className="deals-header__title page-title">
            <i className="bi bi-briefcase-fill" aria-hidden="true" />
            Deal Workspaces
          </h1>
          <p className="deals-header__sub">
            Manage live pipelines and track outreach across your team
          </p>
        </div>
        <button type="button" className="deal-btn" onClick={() => setCreateOpen(true)}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> New Deal
        </button>
      </div>

      <div className="deals-filter-tabs" role="tablist" aria-label="Deal status filter">
        {(['active', 'archived', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={`deals-filter-tabs__btn${filter === f ? ' is-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="deals-loading">
          <Spinner />
        </div>
      ) : deals.length === 0 ? (
        <div className="deals-empty">
          <i className="bi bi-building" aria-hidden="true" />
          <p className="deals-empty__title">No deals yet</p>
          <p className="deals-empty__sub">Create your first deal workspace to get started</p>
          <button type="button" className="deal-btn" onClick={() => setCreateOpen(true)}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Create Deal
          </button>
        </div>
      ) : (
        <div className="deals-grid">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>
      )}

      <CreateDealModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(paths.dealWorkspace(id))}
      />
    </div>
  );
}
