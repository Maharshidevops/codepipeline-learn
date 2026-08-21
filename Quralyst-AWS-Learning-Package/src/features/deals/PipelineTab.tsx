// Deal Pipeline tab — company table with filters + stage pills (QURALYST-20 parity).
import { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@/components/ui';
import { dealsService, type Deal, type CompanyRecord, type DealStage } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import CompanyDetailPanel from './CompanyDetailPanel';
import '@/styles/pages/deals.css';

type SortKey = 'company_name' | '-company_name' | '-updated_at' | '-created_at';

function StagePill({
  stageId,
  stages,
  companyName,
  onChange,
}: {
  stageId: string;
  stages: DealStage[];
  companyName: string;
  onChange: (id: string) => void;
}) {
  const stage = stages.find((s) => s.stageId === stageId);
  const color = stage?.color || '#6366f1';
  return (
    <select
      className="deal-stage-pill"
      value={stageId}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Stage for ${companyName}`}
      style={{ backgroundColor: `${color}22`, color }}
    >
      {stages.map((s) => (
        <option key={s.stageId} value={s.stageId}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export default function PipelineTab({
  deal,
  onDealRefresh,
}: {
  deal: Deal;
  onDealRefresh?: () => void | Promise<void>;
}) {
  const toast = useToast();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompanyRecord | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('__all__');
  const [ownerFilter, setOwnerFilter] = useState('__all__');
  const [sort, setSort] = useState<SortKey>('company_name');
  const stageName = new Map(deal.stages.map((s) => [s.stageId, s.name]));

  const load = async () => {
    setLoading(true);
    try {
      setCompanies(await dealsService.listCompanies(deal.id));
    } catch {
      toast.error('Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  const filtered = useMemo(() => {
    let rows = [...companies];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          (c.website || '').toLowerCase().includes(q) ||
          (c.ownerName || '').toLowerCase().includes(q),
      );
    }
    if (stageFilter !== '__all__') {
      rows = rows.filter((c) => c.stageId === stageFilter);
    }
    if (ownerFilter !== '__all__') {
      rows = rows.filter((c) => (c.ownerUserId || '') === ownerFilter);
    }
    rows.sort((a, b) => {
      if (sort === 'company_name') return a.companyName.localeCompare(b.companyName);
      if (sort === '-company_name') return b.companyName.localeCompare(a.companyName);
      return a.companyName.localeCompare(b.companyName);
    });
    return rows;
  }, [companies, search, stageFilter, ownerFilter, sort]);

  const changeStage = async (rec: CompanyRecord, stageId: string) => {
    const prev = rec.stageId;
    const target = deal.stages.find((s) => s.stageId === stageId);
    let passReason = '';
    if (target?.isTerminal && !/won|closed$/i.test(target.name)) {
      passReason =
        window.prompt(`Why did this buyer pass? (optional)\nMoving to "${target.name}"`) ?? '';
    }
    setCompanies((cs) =>
      cs.map((c) =>
        c.id === rec.id ? { ...c, stageId, passReason: passReason || c.passReason } : c,
      ),
    );
    try {
      const updated = await dealsService.changeStage(deal.id, rec.id, stageId, passReason);
      setCompanies((cs) => cs.map((c) => (c.id === rec.id ? updated : c)));
      if (selected?.id === rec.id) setSelected(updated);
      void onDealRefresh?.();
    } catch (err) {
      setCompanies((cs) => cs.map((c) => (c.id === rec.id ? { ...c, stageId: prev } : c)));
      toast.error((err as { message?: string })?.message ?? 'Could not move company.');
    }
  };

  const removeCompany = async (rec: CompanyRecord) => {
    try {
      await dealsService.deleteCompany(deal.id, rec.id);
      setCompanies((cs) => cs.filter((c) => c.id !== rec.id));
      if (selected?.id === rec.id) setSelected(null);
      void onDealRefresh?.();
    } catch {
      toast.error('Could not remove company.');
    }
  };

  if (loading) {
    return (
      <div className="org-tab-loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="deal-pipeline">
      <div className="deal-pipeline-filters">
        <input
          className="form-control form-control-sm"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search companies"
        />
        <select
          className="form-select form-select-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          aria-label="Filter by stage"
        >
          <option value="__all__">All stages</option>
          {[...deal.stages]
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <option key={s.stageId} value={s.stageId}>
                {s.name}
              </option>
            ))}
        </select>
        <select
          className="form-select form-select-sm"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          aria-label="Filter by owner"
        >
          <option value="__all__">All owners</option>
          {deal.members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name || m.email || m.userId}
            </option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort companies"
        >
          <option value="company_name">Name A→Z</option>
          <option value="-company_name">Name Z→A</option>
        </select>
      </div>

      {companies.length === 0 ? (
        <div className="deal-table-wrap deal-table-wrap--pipeline">
          <div className="deal-pipeline-empty">
            <p className="mb-0">
              No companies yet. Use <strong>Add Company</strong> or{' '}
              <strong>Import from list</strong> above.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="deal-table-wrap deal-table-wrap--pipeline">
          <div className="deal-pipeline-empty">
            <p className="mb-0">No companies match these filters.</p>
          </div>
        </div>
      ) : (
        <div className="deal-table-wrap deal-table-wrap--pipeline">
          <table className="deal-table deal-table--pipeline">
            <thead>
              <tr>
                <th className="deal-col--company">Company</th>
                <th className="deal-col--stage">Stage</th>
                <th className="deal-col--owner">Owner</th>
                <th className="deal-col--tier">Tier</th>
                <th className="deal-col--actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className={selected?.id === c.id ? 'is-selected' : ''}
                  onClick={() => setSelected(c)}
                >
                  <td className="deal-col--company">
                    <button
                      type="button"
                      className="deal-company-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(c);
                      }}
                    >
                      <span className="deal-company-name">{c.companyName}</span>
                      {c.website ? <span className="deal-company-web">{c.website}</span> : null}
                    </button>
                  </td>
                  <td className="deal-col--stage">
                    <StagePill
                      stageId={c.stageId}
                      stages={deal.stages}
                      companyName={c.companyName}
                      onChange={(id) => changeStage(c, id)}
                    />
                  </td>
                  <td className="deal-col--owner">
                    <span className="deal-owner-label">{c.ownerName || 'Unassigned'}</span>
                  </td>
                  <td className="deal-col--tier">{c.tier ? `T${c.tier}` : '—'}</td>
                  <td className="deal-col--actions">
                    <button
                      type="button"
                      className="deal-row-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeCompany(c);
                      }}
                      aria-label={`Remove ${c.companyName}`}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <CompanyDetailPanel
          dealId={deal.id}
          record={selected}
          members={deal.members}
          stageLabel={stageName.get(selected.stageId) ?? ''}
          onClose={() => setSelected(null)}
          onUpdated={(rec) => {
            setCompanies((cs) => cs.map((c) => (c.id === rec.id ? rec : c)));
            setSelected(rec);
          }}
        />
      )}
    </div>
  );
}
