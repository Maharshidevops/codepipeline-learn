import { usePermissions } from '@/hooks/usePermissions';
// IB Vertical — bank detail (F34.4).
// Port of Replit QURALYST-20/artifacts/pe-scraper/src/pages/IBDetail.tsx:
//   • Header with icon, meta, scrape trigger
//   • Overview / Transactions / Professionals tabs
//   • Advisory profile, enrichment status, deal-type badges
// Gated by RoleRoute role="pe_dataset". Types: `src/types/ib.ts`.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Spinner, TextInput } from '@/components/ui';
import { fmtDealDate, fmtDealSize, fmtNum, fmtRelativeTime } from '@/components/pe/ib/ibUtils';
import { ibKeys } from '@/components/pe/ib/ibKeys';
import { ibService } from '@/services/api';
import { paths } from '@/routes/paths';
import type { ApiError, IBBankPatch, IBTransaction } from '@/types';
import '@/styles/pages/ib-bank-detail.css';

const STALE = 60_000;
type TabId = 'overview' | 'transactions' | 'people';

const DEAL_TYPE_CLASS: Record<string, string> = {
  'M&A': 'ibd-badge--ma',
  IPO: 'ibd-badge--ipo',
  Restructuring: 'ibd-badge--restr',
};

function dealBadgeClass(type: string | null): string {
  if (!type) return 'ibd-badge--default';
  for (const [key, cls] of Object.entries(DEAL_TYPE_CLASS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'ibd-badge--default';
}

function isNotFound(error: unknown): boolean {
  const s = (error as ApiError | null)?.status;
  return s === 404 || s === 400;
}

export default function IBBankDetailPage() {
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('overview');
  const [editing, setEditing] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [form, setForm] = useState<IBBankPatch>({});

  const bank = useQuery({
    queryKey: ibKeys.bank(id),
    queryFn: () => ibService.getBank(id),
    staleTime: STALE,
    retry: false,
  });

  const transactions = useQuery({
    queryKey: ibKeys.bankTransactions(id),
    queryFn: () => ibService.bankTransactions(id),
    staleTime: STALE,
    enabled: !!bank.data,
  });

  const people = useQuery({
    queryKey: ibKeys.bankPeople(id),
    queryFn: () => ibService.bankPeople(id),
    staleTime: STALE,
    enabled: !!bank.data,
  });

  const enrichmentStatus = useQuery({
    queryKey: ibKeys.bankEnrichmentStatus(id),
    queryFn: () => ibService.bankEnrichmentStatus(id),
    staleTime: STALE,
    enabled: !!bank.data,
  });

  const patch = useMutation({
    mutationFn: (body: IBBankPatch) => ibService.updateBank(id, body),
    onSuccess: (updated) => {
      qc.setQueryData(ibKeys.bank(id), updated);
      setEditing(false);
    },
  });

  const scrape = useMutation({
    mutationFn: () => ibService.scrapeBank(id),
    onSuccess: () => {
      setTriggerMsg('Scrape queued.');
      void qc.invalidateQueries({ queryKey: ibKeys.bankEnrichmentStatus(id) });
    },
    onError: (e) => setTriggerMsg((e as unknown as ApiError)?.message ?? 'Scrape failed'),
  });

  const enrich = useMutation({
    mutationFn: () => ibService.enrichBank(id),
    onSuccess: () => {
      setTriggerMsg('Enrichment queued.');
      void qc.invalidateQueries({ queryKey: ibKeys.bankEnrichmentStatus(id) });
    },
    onError: (e) => setTriggerMsg((e as unknown as ApiError)?.message ?? 'Enrich failed'),
  });

  function startEdit() {
    const b = bank.data;
    if (!b) return;
    setForm({
      name: b.name,
      websiteUrl: b.websiteUrl,
      description: b.description,
      dealFocus: b.dealFocus,
      dealTypes: b.dealTypes,
      hqLocation: b.hqLocation,
      status: b.status,
    });
    setEditing(true);
  }

  if (bank.isLoading) {
    return (
      <div className="ibd-page text-center py-5">
        <Spinner />
      </div>
    );
  }

  if (bank.error && isNotFound(bank.error)) {
    return (
      <div className="ibd-page text-center py-5 text-muted" data-testid="ib-bank-not-found">
        <h1 className="h4">Bank not found</h1>
        <p>This bank does not exist, or the link is invalid.</p>
        <Link to={paths.ib.banks}>Back to Investment Banks</Link>
      </div>
    );
  }

  const b = bank.data;
  if (!b) return null;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions', count: b.transactionsCount },
    { id: 'people', label: 'Professionals', count: b.peopleCount },
  ];

  return (
    <div className="ibd-page">
      <Link to={paths.ib.banks} className="ibd-back">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        Back to Investment Banks
      </Link>

      <div className="ibd-header">
        <div className="ibd-header__left">
          <div className="ibd-header__icon">
            <i className="bi bi-bank" aria-hidden="true" />
          </div>
          <div>
            <h1 className="ibd-header__title">{b.name}</h1>
            <div className="ibd-header__meta">
              <a href={b.websiteUrl} target="_blank" rel="noreferrer">
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                {b.websiteUrl.replace(/^https?:\/\//, '')}
              </a>
              {b.hqLocation && (
                <span>
                  <i className="bi bi-geo-alt" aria-hidden="true" />
                  {b.hqLocation}
                </span>
              )}
              {b.criteriaAutoFilled && (
                <span className="ibd-ai-badge">
                  <i className="bi bi-cpu" aria-hidden="true" />
                  AI Filled
                </span>
              )}
              {b.lastScrapedAt && <span>Last scraped {fmtRelativeTime(b.lastScrapedAt)}</span>}
            </div>
          </div>
        </div>
        {isStaff && (
          <button
            type="button"
            className="ibd-btn"
            onClick={() => scrape.mutate()}
            disabled={scrape.isPending}
            data-testid="ib-scrape-now"
          >
            <i
              className={`bi ${scrape.isPending ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`}
              aria-hidden="true"
            />
            {scrape.isPending ? 'Scraping…' : 'Scrape Now'}
          </button>
        )}
      </div>

      {triggerMsg && (
        <div className="ibd-msg" role="status" data-testid="ib-trigger-msg">
          {triggerMsg}
        </div>
      )}

      <div className="ibd-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ibd-tab${tab === t.id ? ' ibd-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count != null && t.count > 0 && <span className="ibd-tab__count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div data-testid="ib-overview">
          <div className="ibd-stats">
            {[
              { label: 'Transactions', value: b.transactionsCount.toLocaleString() },
              { label: 'Professionals', value: b.peopleCount.toLocaleString() },
              { label: 'Status', value: b.status },
            ].map((s) => (
              <div key={s.label} className="ibd-stat" data-testid={`stat-${s.label.toLowerCase()}`}>
                <div className="ibd-stat__value">{s.value}</div>
                <div className="ibd-stat__label">{s.label}</div>
              </div>
            ))}
          </div>

          {(b.dealFocus || b.dealTypes || b.hqLocation) && (
            <div className="ibd-card">
              <div className="ibd-overview-head">
                <h2 className="ibd-card__title" style={{ margin: 0 }}>
                  Advisory Profile
                </h2>
                {isStaff && !editing && (
                  <button
                    type="button"
                    className="ibd-btn ibd-btn--outline"
                    onClick={startEdit}
                    data-testid="ib-edit"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    patch.mutate(form);
                  }}
                  data-testid="ib-edit-form"
                >
                  <TextInput
                    label="Name"
                    value={form.name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <TextInput
                    label="Website URL"
                    value={form.websiteUrl ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  />
                  <TextInput
                    label="Deal focus"
                    value={form.dealFocus ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, dealFocus: e.target.value }))}
                  />
                  <TextInput
                    label="Deal types"
                    value={form.dealTypes ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, dealTypes: e.target.value }))}
                  />
                  <TextInput
                    label="HQ location"
                    value={form.hqLocation ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, hqLocation: e.target.value }))}
                  />
                  <TextInput
                    label="Description"
                    value={form.description ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  <div className="ibd-edit-actions">
                    <button
                      type="submit"
                      className="ibd-btn"
                      disabled={patch.isPending}
                      data-testid="ib-save"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="ibd-btn ibd-btn--outline"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {b.dealTypes && (
                    <div className="mb-3">
                      <div className="ibd-profile-item__label mb-1">Deal Types</div>
                      <div>
                        {b.dealTypes.split(',').map((t) => (
                          <span key={t} className="ibd-chip">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {b.dealFocus && (
                    <div className="mb-3">
                      <div className="ibd-profile-item__label mb-1">Focus</div>
                      <p className="mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                        {b.dealFocus}
                      </p>
                    </div>
                  )}
                  <div className="ibd-profile-grid">
                    {b.hqLocation && (
                      <div>
                        <div className="ibd-profile-item__label">Headquarters</div>
                        <div className="ibd-profile-item__value">{b.hqLocation}</div>
                      </div>
                    )}
                    {b.foundedYear != null && (
                      <div>
                        <div className="ibd-profile-item__label">Founded</div>
                        <div className="ibd-profile-item__value">{b.foundedYear}</div>
                      </div>
                    )}
                    {b.employeeCount != null && (
                      <div>
                        <div className="ibd-profile-item__label">Employees</div>
                        <div className="ibd-profile-item__value">{fmtNum(b.employeeCount)}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {b.description && !editing && (
            <div className="ibd-card">
              <h2 className="ibd-card__title">Description</h2>
              <p className="mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                {b.description}
              </p>
            </div>
          )}

          {!b.dealFocus && !b.dealTypes && !b.description && (
            <div className="ibd-empty-dash">
              <i
                className="bi bi-cpu d-block mb-2"
                style={{ fontSize: '2rem', opacity: 0.3 }}
                aria-hidden="true"
              />
              <p className="fw-medium mb-1">No advisory data scraped yet</p>
              <p className="small mb-0">
                Click &quot;Scrape Now&quot; to fetch deal focus and advisory details.
              </p>
            </div>
          )}

          {enrichmentStatus.data && enrichmentStatus.data.total > 0 && (
            <div className="ibd-card" data-testid="ib-enrichment-status">
              <div className="ibd-overview-head">
                <h2 className="ibd-card__title" style={{ margin: 0 }}>
                  <i className="bi bi-lightning-fill me-1" aria-hidden="true" />
                  Auto-Enrichment
                </h2>
                <button
                  type="button"
                  className="ibd-btn ibd-btn--outline"
                  onClick={() => enrich.mutate()}
                  disabled={enrich.isPending || enrichmentStatus.data.activeJobs.length > 0}
                  data-testid="ib-run-enrich"
                >
                  Run Enrichment
                </button>
              </div>
              <div className="ibd-enrich-grid">
                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>URL Lookup</span>
                    <span>
                      {enrichmentStatus.data.urlAttempted}/{enrichmentStatus.data.total}
                    </span>
                  </div>
                  <div className="small text-muted">{enrichmentStatus.data.urlEnriched} found</div>
                </div>
                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Location</span>
                    <span>
                      {enrichmentStatus.data.locationAttempted}/{enrichmentStatus.data.total}
                    </span>
                  </div>
                  <div className="small text-muted">
                    {enrichmentStatus.data.locationEnriched} found
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <TransactionsPanel transactions={transactions.data ?? []} loading={!transactions.data} />
      )}

      {tab === 'people' && <PeoplePanel people={people.data} loading={!people.data} />}
    </div>
  );
}

function TransactionsPanel({
  transactions,
  loading,
}: {
  transactions: IBTransaction[];
  loading: boolean;
}) {
  return (
    <div className="ibd-table-wrap" data-testid="ib-bank-transactions">
      <table className="ibd-table">
        <thead>
          <tr>
            <th>Deal / Target</th>
            <th>Type</th>
            <th>Size</th>
            <th>Date</th>
            <th>Acquirer</th>
            <th>Role</th>
            <th>Sector</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="text-center py-4 text-muted">
                Loading…
              </td>
            </tr>
          ) : transactions.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-5 text-muted">
                <i
                  className="bi bi-cash-coin d-block mb-2"
                  style={{ fontSize: '2rem', opacity: 0.3 }}
                  aria-hidden="true"
                />
                <div className="fw-medium mb-1">No transactions scraped yet</div>
                <div className="small">Click &quot;Scrape Now&quot; to fetch tombstone data.</div>
              </td>
            </tr>
          ) : (
            transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="fw-medium">
                  {tx.dealName ?? tx.targetCompany ?? '—'}
                  {tx.targetCompany && tx.dealName && tx.targetCompany !== tx.dealName && (
                    <div className="small text-muted">{tx.targetCompany}</div>
                  )}
                </td>
                <td>
                  {tx.dealType ? (
                    <span className={`ibd-badge ${dealBadgeClass(tx.dealType)}`}>
                      {tx.dealType}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{fmtDealSize(tx) || '—'}</td>
                <td className="text-muted">{fmtDealDate(tx.dealDate)}</td>
                <td className="text-muted">{tx.acquirerCompany ?? '—'}</td>
                <td className="text-muted">{tx.role ?? '—'}</td>
                <td className="text-muted">{tx.sector ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PeoplePanel({
  people,
  loading,
}: {
  people: import('@/types').IBPerson[] | undefined;
  loading: boolean;
}) {
  return (
    <div className="ibd-people" data-testid="ib-bank-people">
      {loading ? (
        <div className="text-muted py-4 text-center">Loading…</div>
      ) : !people?.length ? (
        <div className="ibd-empty-dash">
          <i
            className="bi bi-people d-block mb-2"
            style={{ fontSize: '2rem', opacity: 0.3 }}
            aria-hidden="true"
          />
          <p className="fw-medium mb-1">No professionals for this bank yet</p>
          <p className="small mb-0">Trigger a scrape to populate the team.</p>
        </div>
      ) : (
        people.map((p) => (
          <div key={p.id} className="ibd-person" data-testid="person-card">
            <div className="ibd-person__head">
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="ibd-person__name">{p.name}</span>
                  {p.title && <span className="ibd-person__title">{p.title}</span>}
                  {p.location && (
                    <span className="small text-muted">
                      <i className="bi bi-geo-alt me-1" aria-hidden="true" />
                      {p.location}
                    </span>
                  )}
                </div>
                {p.bio && <p className="ibd-person__bio">{p.bio}</p>}
                {p.email && (
                  <div className="small mt-2 d-flex align-items-center gap-2">
                    <a href={`mailto:${p.email}`}>{p.email}</a>
                    {p.emailInferred && (
                      <span className="ibd-inferred" data-testid="inferred-email">
                        Inferred
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="ibd-person__links">
                {p.email && (
                  <a href={`mailto:${p.email}`} title={p.email} aria-label={`Email ${p.name}`}>
                    <i className="bi bi-envelope" aria-hidden="true" />
                  </a>
                )}
                {p.linkedinUrl && (
                  <a
                    href={p.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${p.name} on LinkedIn`}
                  >
                    <i className="bi bi-linkedin" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
