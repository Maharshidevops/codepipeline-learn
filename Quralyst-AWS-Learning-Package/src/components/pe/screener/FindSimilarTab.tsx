// Find Similar tab (F29.2) — QURALYST-20 SimilarFirmsScreener UI: colored mode cards, hero
// input, criteria panel, ranked firm cards (medal ranks, score bar, expandable evidence), Mode C
// criteria grid + CSV download. POSTs /api/pe/screener/find-similar-firms.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button } from '@/components/ui';
import { peScreenerService } from '@/services/api';
import { paths } from '@/routes/paths';
import { useToast } from '@/hooks/useToast';
import { fmtRange } from './screenerUtils';
import type {
  PEScreenerFindSimilarBody,
  PEScreenerSearchMode,
  PEScreenerSimilarFirm,
} from '@/types';

const MODE_OPTIONS: {
  id: PEScreenerSearchMode;
  label: string;
  sublabel: string;
  tone: 'green' | 'amber' | 'blue';
}[] = [
  {
    id: 'current_owners',
    label: 'Current Owners',
    sublabel: 'PE firms that currently own similar companies',
    tone: 'green',
  },
  {
    id: 'past_owners',
    label: 'Past Owners',
    sublabel: 'PE firms that previously owned similar companies but no longer do',
    tone: 'amber',
  },
  {
    id: 'sector_interest_only',
    label: 'Sector Interest',
    sublabel: 'PE firms with a stated interest in the sector but no prior ownership',
    tone: 'blue',
  },
];

const EXAMPLES = [
  'B2B SaaS platform for healthcare revenue cycle management',
  'Mid-market industrial distribution company serving the Southeast US',
  'Direct-to-consumer pet food brand with subscription model',
  'Specialty chemicals manufacturer focused on industrial coatings',
];

function rankClass(idx: number): string {
  if (idx === 0) return 'pes-rank pes-rank--gold';
  if (idx === 1) return 'pes-rank pes-rank--silver';
  if (idx === 2) return 'pes-rank pes-rank--bronze';
  return 'pes-rank';
}

function escapeCsv(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function resultHeading(mode: PEScreenerSearchMode, count: number): string {
  if (count === 0) return 'No matching PE firms found';
  const n = `${count} PE firm${count !== 1 ? 's' : ''}`;
  if (mode === 'current_owners') return `${n} currently own similar companies`;
  if (mode === 'past_owners') return `${n} previously owned similar companies`;
  return `${n} with a stated interest in this sector (no prior ownership)`;
}

function ModeCCriteria({ firm }: { firm: PEScreenerSimilarFirm }) {
  return (
    <div className="pes-similar-criteria-grid">
      <div>
        <p className="pes-similar-criteria-grid__label">Sector Criteria</p>
        <p className="pes-similar-criteria-grid__value">{firm.sectorCriteria ?? '—'}</p>
      </div>
      <div>
        <p className="pes-similar-criteria-grid__label">Geography</p>
        <p className="pes-similar-criteria-grid__value">{firm.geoCriteria ?? '—'}</p>
      </div>
      <div>
        <p className="pes-similar-criteria-grid__label">Revenue</p>
        <p className="pes-similar-criteria-grid__value">{fmtRange(firm.revMin, firm.revMax)}</p>
      </div>
      <div>
        <p className="pes-similar-criteria-grid__label">EBITDA</p>
        <p className="pes-similar-criteria-grid__value">
          {fmtRange(firm.ebitdaMin, firm.ebitdaMax)}
        </p>
      </div>
      <div>
        <p className="pes-similar-criteria-grid__label">Enterprise Value</p>
        <p className="pes-similar-criteria-grid__value">{fmtRange(firm.evMin, firm.evMax)}</p>
      </div>
      <div>
        <p className="pes-similar-criteria-grid__label">Equity Check</p>
        <p className="pes-similar-criteria-grid__value">
          {fmtRange(firm.equityCheckMin, firm.equityCheckMax)}
        </p>
      </div>
      {firm.negativeEbitdaOk != null && (
        <div>
          <p className="pes-similar-criteria-grid__label">Neg. EBITDA OK</p>
          <p className="pes-similar-criteria-grid__value">{firm.negativeEbitdaOk ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
}

export default function FindSimilarTab() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<PEScreenerSearchMode>('current_owners');
  const [expandedFirm, setExpandedFirm] = useState<string | null>(null);
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (body: PEScreenerFindSimilarBody) => peScreenerService.findSimilarFirms(body),
    onError: (e: { message?: string }) => {
      toast.error(e?.message || 'Search failed. Please try again.');
    },
  });

  const result = mutation.data;
  const isPending = mutation.isPending;
  const error = mutation.error as { message?: string } | null;

  function handleSubmit() {
    if (!query.trim() || isPending) return;
    setExpandedFirm(null);
    mutation.mutate({ query: query.trim(), mode });
  }

  function handleModeChange(next: PEScreenerSearchMode) {
    setMode(next);
    setExpandedFirm(null);
    mutation.reset();
  }

  const resultMode = result?.mode ?? mode;
  const isSectorMode = resultMode === 'sector_interest_only';

  function handleDownloadCsv() {
    if (!result?.firms.length) return;
    const headers = isSectorMode
      ? [
          'Firm Rank',
          'PE Firm',
          'PE Firm Website',
          'Sector Criteria',
          'Geo Criteria',
          'Rev Range',
          'EBITDA Range',
          'EV Range',
          'Equity Check',
        ]
      : [
          'Firm Rank',
          'PE Firm',
          'PE Firm Website',
          'Firm Best Match Score (%)',
          'Total Similar Companies',
          'Company Name',
          'Sector',
          'Geography',
          'Investment Status',
          'Investment Date',
          'Match Score (%)',
          'Match Reason',
          'Description',
          'Company Website',
        ];
    const rows: string[][] = [];
    result.firms.forEach((firm, idx) => {
      if (isSectorMode) {
        rows.push([
          String(idx + 1),
          firm.firmName,
          firm.firmWebsite ?? '',
          firm.sectorCriteria ?? '',
          firm.geoCriteria ?? '',
          fmtRange(firm.revMin, firm.revMax),
          fmtRange(firm.ebitdaMin, firm.ebitdaMax),
          fmtRange(firm.evMin, firm.evMax),
          fmtRange(firm.equityCheckMin, firm.equityCheckMax),
        ]);
      } else {
        firm.topMatches.forEach((h) => {
          rows.push([
            String(idx + 1),
            firm.firmName,
            firm.firmWebsite ?? '',
            String(firm.score),
            String(firm.matchCount),
            h.companyName,
            h.sector ?? '',
            h.geography ?? '',
            h.investmentStatus ?? '',
            h.investmentDate ?? '',
            h.similarity != null ? String(h.similarity) : '',
            h.matchReason ?? '',
            h.description ?? '',
            h.websiteUrl ?? '',
          ]);
        });
      }
    });
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pe-scout-${result.mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const modeHeading =
    mode === 'current_owners'
      ? 'Find PE Firms Currently Owning Similar Companies'
      : mode === 'past_owners'
        ? 'Find PE Firms That Previously Owned Similar Companies'
        : 'Find PE Firms Interested in This Sector (No Prior Ownership)';

  return (
    <div className="pes-similar">
      <div className="pes-mode-grid" role="radiogroup" aria-label="Search mode">
        {MODE_OPTIONS.map((opt) => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`pes-mode${active ? ` is-active pes-mode--${opt.tone}` : ''}`}
              onClick={() => handleModeChange(opt.id)}
            >
              <span className="pes-mode__label">{opt.label}</span>
              <span className="pes-mode__sub">{opt.sublabel}</span>
            </button>
          );
        })}
      </div>

      <div className="pes-hero">
        <div className="pes-hero__head">
          <div className="pes-hero__icon" aria-hidden="true">
            <i className="bi bi-bullseye" />
          </div>
          <div>
            <h2 className="pes-hero__title">{modeHeading}</h2>
            <p className="pes-hero__sub">
              Describe your target company — industry, business model, geography, size, or anything
              relevant.
            </p>
          </div>
        </div>

        <textarea
          className="pes-hero__textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          placeholder="e.g. A SaaS company providing compliance management software to mid-market financial services firms in North America..."
          disabled={isPending}
          aria-label="Target company description"
          rows={3}
        />

        <div className="pes-hero__foot">
          <div className="pes-examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="pes-example" onClick={() => setQuery(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!query.trim() || isPending}
            loading={isPending}
            icon={!isPending ? <i className="bi bi-stars" aria-hidden="true" /> : undefined}
          >
            {isPending ? 'Searching…' : 'Search'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="pes-alert pes-alert--danger" role="alert">
          {error.message || 'Search failed. Please try again.'}
        </div>
      )}

      {isPending && (
        <div className="pes-similar-loading" aria-live="polite" aria-label="Searching">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="pes-similar-skel">
              <span className="pes-skel" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              <div className="pes-similar-skel__lines">
                <span className="pes-skel" style={{ width: 180, height: 14 }} />
                <span className="pes-skel" style={{ width: 240, height: 12 }} />
              </div>
            </div>
          ))}
          <p className="pes-muted">
            Analysing portfolios across the dataset — this can take a moment for large searches.
          </p>
        </div>
      )}

      {result && !isPending && (
        <div>
          <div className="pes-criteria">
            <p className="pes-criteria__eyebrow">Industry identified:</p>
            <p className="pes-criteria__industry">{result.criteria.industryLabel || '—'}</p>
            <div className="pes-criteria__chips">
              {result.criteria.sectors.map((s) => (
                <Badge key={s} tone="info" className="pes-chip pes-chip--blue">
                  {s}
                </Badge>
              ))}
              {result.criteria.subTerms.map((t) => (
                <Badge key={t} tone="secondary" className="pes-chip pes-chip--outline">
                  {t}
                </Badge>
              ))}
              {result.criteria.geography && (
                <Badge tone="success" className="pes-chip pes-chip--green">
                  {result.criteria.geography}
                </Badge>
              )}
            </div>
            {result.criteria.rationale && (
              <p className="pes-criteria__rationale">{result.criteria.rationale}</p>
            )}
          </div>

          <div className="pes-results-head">
            <div>
              <h3 className="pes-results-head__title">
                {resultHeading(result.mode, result.firms.length)}
              </h3>
              {result.candidatesSearched > 0 && (
                <p className="pes-muted">
                  Searched {result.candidatesSearched.toLocaleString()} portfolio company
                  descriptions
                </p>
              )}
            </div>
            {result.firms.length > 0 && (
              <Button
                variant="popup-secondary"
                size="sm"
                onClick={handleDownloadCsv}
                icon={<i className="bi bi-download" aria-hidden="true" />}
              >
                Download CSV
              </Button>
            )}
          </div>

          {result.firms.length === 0 && (
            <div className="pes-alert pes-alert--warn" role="status">
              {result.message || 'No matching PE firms found. Try rephrasing your description.'}
            </div>
          )}

          {isSectorMode && result.firms.length > 0 && (
            <div className="pes-firm-cards">
              {result.firms.map((firm, idx) => (
                <div key={firm.firmId} className="pes-firm-card">
                  <div className="pes-firm-card__row">
                    <span className={rankClass(idx)} aria-hidden="true">
                      {idx + 1}
                    </span>
                    <div className="pes-firm-card__main">
                      <div className="pes-firm-card__name-row">
                        <Link to={paths.pe.firm(firm.firmId)} className="pes-firm-link">
                          {firm.firmName}
                        </Link>
                        {firm.firmStatus === 'active' && (
                          <Badge tone="success" className="pes-chip pes-chip--green">
                            Active
                          </Badge>
                        )}
                        {firm.firmWebsite && (
                          <a
                            href={firm.firmWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="pes-web"
                            aria-label={`${firm.firmName} website`}
                          >
                            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                          </a>
                        )}
                        {/* Keep score text for F29.2 Mode C tests */}
                        <span className="pes-score-badge">{firm.score}% best match</span>
                      </div>
                      {firm.firmDescription && (
                        <p className="pes-firm-card__desc">{firm.firmDescription}</p>
                      )}
                    </div>
                  </div>
                  <ModeCCriteria firm={firm} />
                </div>
              ))}
            </div>
          )}

          {!isSectorMode && (
            <div className="pes-firm-cards">
              {result.firms.map((firm, idx) => {
                const isExpanded = expandedFirm === firm.firmId;
                const canExpand = firm.topMatches.length > 0;
                return (
                  <div key={firm.firmId} className="pes-firm-card">
                    <div className="pes-firm-card__row">
                      <span className={rankClass(idx)} aria-hidden="true">
                        {idx + 1}
                      </span>
                      <div className="pes-firm-card__main">
                        <div className="pes-firm-card__name-row">
                          <Link to={paths.pe.firm(firm.firmId)} className="pes-firm-link">
                            {firm.firmName}
                          </Link>
                          {firm.firmStatus === 'active' && (
                            <Badge tone="success" className="pes-chip pes-chip--green">
                              Active
                            </Badge>
                          )}
                          {firm.firmWebsite && (
                            <a
                              href={firm.firmWebsite}
                              target="_blank"
                              rel="noreferrer"
                              className="pes-web"
                              aria-label={`${firm.firmName} website`}
                            >
                              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                        {firm.firmDescription && (
                          <p className="pes-firm-card__desc">{firm.firmDescription}</p>
                        )}
                      </div>
                      <div className="pes-firm-card__stats">
                        <div className="pes-firm-card__stat">
                          <span className="pes-firm-card__stat-val">{firm.matchCount}</span>
                          <span className="pes-firm-card__stat-lbl">
                            similar co{firm.matchCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="pes-firm-card__stat">
                          <span className="pes-firm-card__stat-val">{firm.score}%</span>
                          <span className="pes-firm-card__stat-lbl">best match</span>
                        </div>
                        <div className="pes-score-bar" aria-hidden="true">
                          <div
                            className="pes-score-bar__fill"
                            style={{ width: `${Math.min(100, firm.score)}%` }}
                          />
                        </div>
                        {/* Visible for tests; also toggles evidence */}
                        {canExpand && (
                          <Button
                            variant="popup-secondary"
                            size="sm"
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedFirm(isExpanded ? null : firm.firmId)}
                          >
                            {isExpanded ? 'Hide evidence' : 'Show evidence'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Screen-reader / test-friendly score phrasing */}
                    <span className="visually-hidden">{firm.score}% best match</span>

                    {canExpand && isExpanded && (
                      <div className="pes-evidence">
                        <div className="pes-evidence__head">
                          <p className="pes-evidence__label">Matching portfolio companies</p>
                          <Link to={paths.pe.firm(firm.firmId)} className="pes-tearsheet">
                            View firm →
                          </Link>
                        </div>
                        <div className="pes-evidence__list">
                          {firm.topMatches.slice(0, 6).map((h) => (
                            <div key={h.id} className="pes-evidence__item">
                              <div className="pes-firm-card__name-row">
                                <span className="fw-medium">{h.companyName}</span>
                                {h.sector && (
                                  <span className="pes-chip pes-chip--outline">{h.sector}</span>
                                )}
                                {h.investmentStatus === 'current' && (
                                  <span className="pes-chip pes-chip--green">Current</span>
                                )}
                                {h.investmentStatus === 'realized' && (
                                  <span className="pes-chip pes-chip--amber">Realized</span>
                                )}
                                {h.similarity != null && (
                                  <span className="pes-match-pct ms-auto">
                                    {h.similarity}% match
                                  </span>
                                )}
                              </div>
                              <div className="pes-muted d-flex flex-wrap gap-3">
                                {h.geography && <span>{h.geography}</span>}
                                {h.investmentDate && <span>Invested: {h.investmentDate}</span>}
                              </div>
                              {h.matchReason && (
                                <p className="pes-evidence__reason">
                                  &ldquo;{h.matchReason}&rdquo;
                                </p>
                              )}
                              {h.description && (
                                <p className="pes-firm-card__desc">{h.description}</p>
                              )}
                            </div>
                          ))}
                          {firm.topMatches.length > 6 && (
                            <p className="pes-muted text-center mb-0">
                              +{firm.topMatches.length - 6} more in CSV download
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!result && !isPending && !error && (
        <div className="pes-similar-empty">
          <i className="bi bi-bullseye" aria-hidden="true" />
          <p>Describe your target company above to find matching PE firms.</p>
        </div>
      )}
    </div>
  );
}
