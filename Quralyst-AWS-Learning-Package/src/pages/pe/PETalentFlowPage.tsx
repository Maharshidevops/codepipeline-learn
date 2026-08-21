// PE Dataset — Talent Flow (F33.2, tables-first v1). Detected cross-firm professional moves over the
// platform-global PE dataset — "who is building a team, who is bleeding talent". A filterable moves feed
// (person, from→to firms, departed/arrived dates, confidence badge, reasons tooltip, LinkedIn-match
// indicator) with a confidence-floor select (default medium; "low" reveals the hidden tier), a debounced
// person-name search (server `search`), a firm filter (`firmId`, either side), and tier-count chips from
// `counts` (constant across floor changes — computed over ALL moves). Two gainers/losers panels from
// `topGainers`/`topLosers` (top 8, signed net). Clicking a person opens the career-history drawer;
// `?person=:id` deep-links straight into it. Charts are out of scope (no chart library). Read-only;
// gated by RoleRoute role="pe_dataset". Contract: backend REF-API-CONTRACT.md §PE Dataset — Talent Flow.
// Spec: PHASE-F33.2.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { TextInput } from '@/components/ui';
import { SelectFilter } from '@/components/pe/screener/screenerHelpers';
import { useDebounce } from '@/components/pe/screener/screenerUtils';
import {
  ConfidenceBadge,
  FlowPanel,
  LinkedinMatchIndicator,
  ReasonsTooltip,
} from '@/components/pe/talentFlow/TalentFlowCards';
import PersonHistoryDrawer from '@/components/pe/talentFlow/PersonHistoryDrawer';
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_ORDER,
  fmtDate,
  fmtNum,
} from '@/components/pe/talentFlow/talentFlowUtils';
import { peTalentFlowKeys } from '@/components/pe/talentFlow/peTalentFlowKeys';
import { peTalentFlowService, peService } from '@/services/api';
import { paths } from '@/routes/paths';
import type { PEMoveConfidence } from '@/types';

const STALE = 60_000;

// Floor options: high | medium | low (choosing "low" reveals the hidden tier).
const CONFIDENCE_OPTIONS = [...CONFIDENCE_ORDER]
  .reverse()
  .map((c) => ({ value: c, label: CONFIDENCE_LABELS[c] }));

// Tier chips, shown high→low. Counts are computed over ALL moves before the floor filter, so they
// don't change when the floor does.
const TIER_ORDER: PEMoveConfidence[] = ['high', 'medium', 'low'];

export default function PETalentFlowPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [confidence, setConfidence] = useState<PEMoveConfidence>('medium');
  const [firmId, setFirmId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 350);

  // The open drawer's person id lives in the URL (`?person=`) so it is shareable / deep-linkable.
  const personId = searchParams.get('person');
  function openPerson(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set('person', id);
    setSearchParams(params);
  }
  function closePerson() {
    const params = new URLSearchParams(searchParams);
    params.delete('person');
    setSearchParams(params);
  }

  // Firms list feeds the searchable firm filter. Uses the unpaginated /options endpoint (the
  // paginated firms route caps pageSize at 100 and 400s above it). Already name-ordered server-side.
  const { data: firmsData } = useQuery({
    queryKey: ['pe', 'firms', 'options'],
    queryFn: () => peService.listFirmOptions(),
    staleTime: STALE,
  });

  const firmOptions = useMemo(
    () =>
      (firmsData ?? [])
        .map((f) => ({ value: f.id, label: f.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [firmsData],
  );

  const params = {
    confidence,
    firmId: firmId || undefined,
    search: search || undefined,
  };

  const moves = useQuery({
    queryKey: peTalentFlowKeys.moves(params),
    queryFn: () => peTalentFlowService.getMoves(params),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const data = moves.data;
  const counts = data?.counts;
  const rows = data?.moves ?? [];
  const loaded = !!data;

  return (
    <div className="container">
      <div className="mb-4">
        <h1 className="mb-1">Talent Flow</h1>
        <p className="text-muted mb-0">
          PE professionals detected moving between firms — a market signal for who is building a
          team and who is bleeding talent. Identity is anchored on LinkedIn where available;
          lower-confidence matches are hidden until you widen the floor.
        </p>
      </div>

      {/* Tier-count chips — constant across floor changes (computed over all moves). */}
      <div className="d-flex flex-wrap gap-3 mb-4" data-testid="tier-chips">
        {TIER_ORDER.map((tier) => (
          <div
            className="card p-3"
            key={tier}
            data-testid={`tier-chip-${tier}`}
            style={{ minWidth: 130 }}
          >
            <div className="h4 mb-0">{fmtNum(counts?.[tier])}</div>
            <div className="text-muted small">{CONFIDENCE_LABELS[tier]} confidence</div>
          </div>
        ))}
      </div>

      {/* Gainers / losers panels. */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <FlowPanel
            title="Top gainers"
            description="Firms with the strongest net inflow of detected talent."
            rows={data?.topGainers ?? []}
            loading={!loaded}
            testId="panel-gainers"
          />
        </div>
        <div className="col-12 col-xl-6">
          <FlowPanel
            title="Top losers"
            description="Firms with the strongest net outflow of detected talent."
            rows={data?.topLosers ?? []}
            loading={!loaded}
            testId="panel-losers"
          />
        </div>
      </div>

      {/* Toolbar — confidence floor, firm filter, person search. Component state (not URL), so the
          query key (which carries the full param tuple) drives refetches. */}
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <div>
          <span className="form-label d-block">Confidence floor</span>
          <SelectFilter
            value={confidence}
            onChange={(v) => setConfidence(v as PEMoveConfidence)}
            options={CONFIDENCE_OPTIONS}
            placeholder="Confidence"
            ariaLabel="Minimum confidence"
          />
        </div>
        <div>
          <span className="form-label d-block">Firm</span>
          <SelectFilter
            value={firmId}
            onChange={setFirmId}
            options={firmOptions}
            placeholder="All firms"
            ariaLabel="Filter by firm"
          />
        </div>
        <div className="flex-grow-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <span className="form-label d-block">Search person</span>
          <TextInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Person name…"
            aria-label="Search by person name"
          />
        </div>
        {loaded && (
          <div className="ms-auto text-muted small">
            {fmtNum(data?.total)} move{data?.total === 1 ? '' : 's'} at ≥{' '}
            {CONFIDENCE_LABELS[confidence].toLowerCase()} confidence
          </div>
        )}
      </div>

      {/* Moves table. */}
      <div className={`table-responsive${moves.isFetching ? ' opacity-50' : ''}`}>
        <table className="table align-middle" data-testid="moves-table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">From → To</th>
              <th scope="col">Departed</th>
              <th scope="col">Arrived</th>
              <th scope="col">Confidence</th>
              <th scope="col">LinkedIn</th>
              <th scope="col">Reasons</th>
            </tr>
          </thead>
          <tbody>
            {!loaded ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-5 text-muted">
                  <div className="fw-medium mb-1">No moves at this confidence floor</div>
                  <div className="small">
                    Lower the floor to Low to surface unconfirmed matches, or clear the filters.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td className="fw-medium">
                    <button
                      type="button"
                      className="btn btn-link p-0 align-baseline text-start"
                      onClick={() => openPerson(m.personKey)}
                      data-testid="person-link"
                    >
                      {m.personName}
                    </button>
                  </td>
                  <td>
                    <Link to={paths.pe.firm(m.fromFirmId)}>{m.fromFirmName ?? '—'}</Link>
                    <span className="mx-1 text-muted" aria-hidden="true">
                      →
                    </span>
                    <Link to={paths.pe.firm(m.toFirmId)}>{m.toFirmName ?? '—'}</Link>
                  </td>
                  <td className="text-muted small text-nowrap">{fmtDate(m.departedAt)}</td>
                  <td className="text-muted small text-nowrap">{fmtDate(m.arrivedAt)}</td>
                  <td>
                    <ConfidenceBadge confidence={m.confidence} />
                  </td>
                  <td>
                    <LinkedinMatchIndicator match={m.linkedinMatch} />
                  </td>
                  <td>
                    <ReasonsTooltip reasons={m.reasons} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PersonHistoryDrawer personId={personId} onClose={closePerson} />
    </div>
  );
}
