import { usePermissions } from '@/hooks/usePermissions';
// PE Dataset — firm detail (F23.4; CU.5 added the edit dialog + portfolio-URLs editor).
// Card-stack dashboard layout matching QURALYST-20 FirmDetail.tsx:
//   Back link · Header card (accent bar, name + status, meta links + pencil editors,
//   action buttons, stats grid 5-col, description clamp) · Investment Criteria card
//   (inline Edit/Save/Cancel) · Team Memory card (firmMemoryService) · Pending-review
//   banner · Deal-flow card (peSignalsService: appetite, tiles, rollups) · Tabs:
//   Overview · Holdings · People · Criteria · Scrape history · Signals
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  peService,
  peFirmKeys,
  peSignalsService,
  firmMemoryService,
  normalizeFirmKey,
} from '@/services/api';
import type { FirmMemory } from '@/services/api';
import { paths } from '@/routes/paths';
import { useToast } from '@/hooks/useToast';
import { Badge, BaseTable, Button, Modal, Spinner, Tabs } from '@/components/ui';
import type { BaseTableColumn } from '@/components/ui';
import { AppetiteBadge } from '@/components/pe/SignalBadges';
import { formatDateTimeShort } from '@/lib/datetime';
import HoldingsTable from '@/components/pe/HoldingsTable';
import PeopleTable from '@/components/pe/PeopleTable';
import FirmSignalsTab from '@/components/pe/signals/FirmSignalsTab';
import type { PEEnrichmentStatus, PEFirm, PEScrapeJob } from '@/types';
import '@/styles/pages/pe-firm-detail.css';

const TABS = [
  { id: 'holdings', label: 'Portfolio Holdings' },
  { id: 'scrapes', label: 'Scrape History' },
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'criteria', label: 'Criteria' },
  { id: 'signals', label: 'Signals' },
];

const FREQ_OPTIONS = [
  { label: 'Every 6h', value: 6 },
  { label: 'Every 12h', value: 12 },
  { label: 'Every 24h', value: 24 },
  { label: 'Every 48h', value: 48 },
  { label: 'Every week', value: 168 },
];

function fmtCurrency(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v}M`;
}

function rangeDisplay(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${fmtCurrency(min)} – ${fmtCurrency(max)}`;
  if (min != null) return `≥ ${fmtCurrency(min)}`;
  if (max != null) return `≤ ${fmtCurrency(max)}`;
  return null;
}

function freshnessClass(f: string | null): string {
  if (f === 'fresh') return 'pfd-freshness--fresh';
  if (f === 'stale') return 'pfd-freshness--stale';
  return 'pfd-freshness--never';
}

function parseNum(s: string): number | null {
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

// ── Header card ─────────────────────────────────────────────────────────────
function HeaderCard({
  firm,
  currentCount,
  realizedCount,
  unknownCount,
  avgHoldPeriod,
  holdingsLoading,
  onEdit,
  onPauseResume,
  onScrape,
  scrapePending,
  pausePending,
}: {
  firm: PEFirm;
  currentCount: number;
  realizedCount: number;
  unknownCount: number;
  avgHoldPeriod: number | null;
  holdingsLoading: boolean;
  onEdit: () => void;
  onPauseResume: () => void;
  onScrape: () => void;
  scrapePending: boolean;
  pausePending: boolean;
}) {
  const toast = useToast();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const queryClient = useQueryClient();
  const isPaused =
    firm.status === 'paused' || firm.status === 'quarantined' || firm.status === 'error';

  const updateFirm = useMutation({
    mutationFn: (patch: Partial<PEFirm>) => peService.updateFirm(firm.id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['pe', 'firm', firm.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['pe', 'firms'] });
    },
  });

  // Inline editor state for portfolio URL
  const [portfolioEditOpen, setPortfolioEditOpen] = useState(false);
  const [portfolioUrlDraft, setPortfolioUrlDraft] = useState('');

  // Inline editor state for team page URL
  const [teamPageEditOpen, setTeamPageEditOpen] = useState(false);
  const [teamPageUrlDraft, setTeamPageUrlDraft] = useState('');

  // Inline editor state for criteria URL
  const [criteriaEditOpen, setCriteriaEditOpen] = useState(false);
  const [criteriaUrlDraft, setCriteriaUrlDraft] = useState('');

  // Frequency picker state
  const [freqOpen, setFreqOpen] = useState(false);
  const [customFreq, setCustomFreq] = useState('');

  const handlePortfolioSave = () => {
    if (!portfolioUrlDraft.trim()) return;
    let url = portfolioUrlDraft.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    updateFirm.mutate({ portfolioUrl: url } as Partial<PEFirm>, {
      onSuccess: () => {
        toast.success('Portfolio URL updated.');
        setPortfolioEditOpen(false);
      },
      onError: () => toast.error('Could not update the portfolio URL.'),
    });
  };

  const handleTeamPageSave = () => {
    const trimmed = teamPageUrlDraft.trim();
    let url: string | null = null;
    if (trimmed) {
      url = trimmed;
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    }
    updateFirm.mutate({ teamPageUrl: url } as Partial<PEFirm>, {
      onSuccess: () => {
        toast.success('Team page URL updated.');
        setTeamPageEditOpen(false);
      },
      onError: () => toast.error('Could not update the team page URL.'),
    });
  };

  const handleCriteriaSave = () => {
    const trimmed = criteriaUrlDraft.trim();
    let url: string | null = null;
    if (trimmed) {
      url = trimmed;
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    }
    updateFirm.mutate({ criteriaUrl: url } as Partial<PEFirm>, {
      onSuccess: () => {
        toast.success('Criteria URL updated.');
        setCriteriaEditOpen(false);
      },
      onError: () => toast.error('Could not update the criteria URL.'),
    });
  };

  const handleSetFrequency = (hours: number) => {
    updateFirm.mutate({ scrapeFrequencyHours: hours } as Partial<PEFirm>, {
      onSuccess: () => {
        toast.success(`Schedule updated — every ${hours}h.`);
        setFreqOpen(false);
        setCustomFreq('');
      },
      onError: () => toast.error('Could not update the schedule.'),
    });
  };

  const handleCustomFreq = () => {
    const h = parseInt(customFreq, 10);
    if (!h || h < 1 || h > 8760) {
      toast.error('Enter a value between 1 and 8760 hours.');
      return;
    }
    handleSetFrequency(h);
  };

  return (
    <div className="pfd-header">
      <div className={`pfd-header__accent${isPaused ? ' pfd-header__accent--paused' : ''}`} />
      <div className="pfd-header__top">
        <div>
          <div className="pfd-header__title-row">
            <h1 className="pfd-header__name">{firm.name}</h1>
            <span
              className={`badge rounded-pill bg-${firm.status === 'active' ? 'success' : 'secondary'}-subtle text-${firm.status === 'active' ? 'success' : 'secondary'}-emphasis border`}
            >
              {firm.status}
            </span>
          </div>
          <div className="pfd-header__meta">
            <a href={firm.websiteUrl} target="_blank" rel="noreferrer">
              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              Website
            </a>

            {/* Portfolio Page + pencil */}
            <span className="pfd-meta-group">
              {firm.portfolioUrl ? (
                <a href={firm.portfolioUrl} target="_blank" rel="noreferrer">
                  <i className="bi bi-briefcase" aria-hidden="true" /> Portfolio Page
                </a>
              ) : (
                <span className="text-muted fst-italic">
                  <i className="bi bi-briefcase" aria-hidden="true" /> No Portfolio Page
                </span>
              )}
              {isStaff && (
                <button
                  className="pfd-pencil-btn"
                  title="Edit portfolio URL"
                  onClick={() => {
                    setPortfolioUrlDraft(firm.portfolioUrl ?? '');
                    setPortfolioEditOpen((o) => !o);
                  }}
                >
                  <i className="bi bi-pencil" aria-hidden="true" />
                </button>
              )}
              {portfolioEditOpen && (
                <div className="pfd-popover">
                  <div className="pfd-popover__title">Portfolio Page URL</div>
                  <p className="pfd-popover__hint">
                    Override the auto-discovered portfolio URL. Changes take effect on the next
                    scrape.
                  </p>
                  <input
                    className="form-control form-control-sm mb-2"
                    placeholder="https://example.com/portfolio"
                    value={portfolioUrlDraft}
                    onChange={(e) => setPortfolioUrlDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePortfolioSave()}
                  />
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="popup-secondary" onClick={() => setPortfolioEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handlePortfolioSave} disabled={updateFirm.isPending}>
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </span>

            {/* Team Page + pencil */}
            <span className="pfd-meta-group">
              {firm.teamPageUrl ? (
                <a href={firm.teamPageUrl} target="_blank" rel="noreferrer">
                  <i className="bi bi-people" aria-hidden="true" /> Team Page
                </a>
              ) : (
                <span className="text-muted fst-italic">
                  <i className="bi bi-people" aria-hidden="true" /> No Team Page
                </span>
              )}
              {isStaff && (
                <button
                  className="pfd-pencil-btn"
                  title="Edit team page URL"
                  onClick={() => {
                    setTeamPageUrlDraft(firm.teamPageUrl ?? '');
                    setTeamPageEditOpen((o) => !o);
                  }}
                >
                  <i className="bi bi-pencil" aria-hidden="true" />
                </button>
              )}
              {teamPageEditOpen && (
                <div className="pfd-popover">
                  <div className="pfd-popover__title">Team Page URL</div>
                  <p className="pfd-popover__hint">
                    Override the auto-discovered team/people page. Leave blank to clear.
                  </p>
                  <input
                    className="form-control form-control-sm mb-2"
                    placeholder="https://example.com/team"
                    value={teamPageUrlDraft}
                    onChange={(e) => setTeamPageUrlDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTeamPageSave()}
                  />
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="popup-secondary" onClick={() => setTeamPageEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleTeamPageSave} disabled={updateFirm.isPending}>
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </span>

            {/* Criteria Page + pencil */}
            <span className="pfd-meta-group">
              {firm.criteriaUrl ? (
                <a href={firm.criteriaUrl} target="_blank" rel="noreferrer">
                  <i className="bi bi-clipboard-data" aria-hidden="true" /> Criteria Page
                </a>
              ) : (
                <span className="text-muted fst-italic">
                  <i className="bi bi-clipboard-data" aria-hidden="true" /> No Criteria Page
                </span>
              )}
              {isStaff && (
                <button
                  className="pfd-pencil-btn"
                  title="Edit criteria URL"
                  onClick={() => {
                    setCriteriaUrlDraft(firm.criteriaUrl ?? '');
                    setCriteriaEditOpen((o) => !o);
                  }}
                >
                  <i className="bi bi-pencil" aria-hidden="true" />
                </button>
              )}
              {criteriaEditOpen && (
                <div className="pfd-popover">
                  <div className="pfd-popover__title">Investment Criteria URL</div>
                  <p className="pfd-popover__hint">
                    Page describing the firm&apos;s investment criteria. Leave blank to clear.
                  </p>
                  <input
                    className="form-control form-control-sm mb-2"
                    placeholder="https://example.com/criteria"
                    value={criteriaUrlDraft}
                    onChange={(e) => setCriteriaUrlDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCriteriaSave()}
                  />
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="popup-secondary" onClick={() => setCriteriaEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCriteriaSave} disabled={updateFirm.isPending}>
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </span>

            {/* Frequency picker */}
            {isStaff && (
              <span className="pfd-meta-group">
                <button
                  className="pfd-meta-btn"
                  title="Change scrape frequency"
                  onClick={() => setFreqOpen((o) => !o)}
                >
                  <i className="bi bi-clock-history" aria-hidden="true" /> Scrapes every{' '}
                  {firm.scrapeFrequencyHours ?? 24}h
                  <i className="bi bi-gear ms-1" aria-hidden="true" />
                </button>
                {freqOpen && (
                  <div className="pfd-popover pfd-popover--freq">
                    <div className="pfd-popover__title">Scrape Frequency</div>
                    <div className="pfd-freq-grid">
                      {FREQ_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          className={`pfd-freq-btn${firm.scrapeFrequencyHours === opt.value ? ' pfd-freq-btn--active' : ''}`}
                          onClick={() => handleSetFrequency(opt.value)}
                        >
                          {opt.label}
                          {firm.scrapeFrequencyHours === opt.value && (
                            <i className="bi bi-check2" aria-hidden="true" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="d-flex gap-2 mt-2">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Custom hours…"
                        type="number"
                        min={1}
                        max={8760}
                        value={customFreq}
                        onChange={(e) => setCustomFreq(e.target.value)}
                      />
                      <Button variant="popup-secondary" onClick={handleCustomFreq}>
                        Set
                      </Button>
                    </div>
                  </div>
                )}
              </span>
            )}
          </div>
        </div>
        {isStaff && (
          <div className="pfd-header__actions">
            <Button variant="popup-secondary" onClick={onEdit}>
              Edit firm
            </Button>
            <Button variant="popup-secondary" onClick={onPauseResume} disabled={pausePending}>
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button disabled={scrapePending} onClick={onScrape}>
              {scrapePending ? 'Queuing…' : 'Scrape now'}
            </Button>
          </div>
        )}
      </div>

      <div className="pfd-header__body">
        <div className="pfd-stats">
          <div>
            <div className="pfd-stat__value">{firm.holdingsCount}</div>
            <div className="pfd-stat__label">Total Holdings</div>
          </div>
          <div>
            <div className="pfd-stat__value pfd-stat__value--current">
              {holdingsLoading ? '…' : currentCount}
            </div>
            <div className="pfd-stat__label">Current Holdings</div>
          </div>
          <div>
            <div className="pfd-stat__value pfd-stat__value--realized">
              {holdingsLoading ? '…' : realizedCount}
            </div>
            <div className="pfd-stat__label">Realized Holdings</div>
          </div>
          <div>
            <div
              className="pfd-stat__value pfd-stat__value--unknown"
              data-testid="pe-unknown-holdings"
            >
              {holdingsLoading ? '…' : unknownCount}
            </div>
            <div className="pfd-stat__label">Unknown Holdings</div>
          </div>
          <div>
            <div className="pfd-stat__value pfd-stat__value--avg">
              {holdingsLoading
                ? '…'
                : avgHoldPeriod === null
                  ? 'N/A'
                  : `${avgHoldPeriod.toFixed(1)} yrs`}
            </div>
            <div className="pfd-stat__label">Avg Holding Period</div>
          </div>
          <div>
            <div className={`pfd-stat__value ${freshnessClass(firm.freshness)}`}>
              {firm.lastScrapedAt ? formatDateTimeShort(firm.lastScrapedAt) : 'Never'}
            </div>
            <div className="pfd-stat__label">
              Last Scraped{firm.freshness !== 'never' ? ` (${firm.freshness})` : ''}
            </div>
          </div>
        </div>

        <div className="pfd-desc">
          <div className="pfd-desc__label">Description</div>
          <p className="pfd-desc__text">{firm.description || 'No description provided.'}</p>
        </div>
      </div>
    </div>
  );
}

// ── Investment Criteria card (inline edit) ──────────────────────────────────
function CriteriaCard({ firm }: { firm: PEFirm }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const derived = new Set((firm.sizeCriteriaDerived ?? '').split(',').filter(Boolean));
  const mark = (key: string) =>
    derived.has(key) ? <span className="pfd-estimated-badge">estimated</span> : null;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    revMin: '',
    revMax: '',
    negativeEbitdaOk: false,
    ebitdaMin: '',
    ebitdaMax: '',
    evMin: '',
    evMax: '',
    equityCheckMin: '',
    equityCheckMax: '',
    sectorCriteria: '',
    geoCriteria: '',
  });

  const updateFirm = useMutation({
    mutationFn: (patch: Partial<PEFirm>) => peService.updateFirm(firm.id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['pe', 'firm', firm.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['pe', 'firms'] });
    },
  });

  const openEdit = () => {
    setForm({
      revMin: firm.revMin != null ? String(firm.revMin) : '',
      revMax: firm.revMax != null ? String(firm.revMax) : '',
      negativeEbitdaOk: firm.negativeEbitdaOk ?? false,
      ebitdaMin: firm.ebitdaMin != null ? String(firm.ebitdaMin) : '',
      ebitdaMax: firm.ebitdaMax != null ? String(firm.ebitdaMax) : '',
      evMin: firm.evMin != null ? String(firm.evMin) : '',
      evMax: firm.evMax != null ? String(firm.evMax) : '',
      equityCheckMin: firm.equityCheckMin != null ? String(firm.equityCheckMin) : '',
      equityCheckMax: firm.equityCheckMax != null ? String(firm.equityCheckMax) : '',
      sectorCriteria: firm.sectorCriteria ?? '',
      geoCriteria: firm.geoCriteria ?? '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateFirm.mutate(
      {
        revMin: parseNum(form.revMin),
        revMax: parseNum(form.revMax),
        negativeEbitdaOk: form.negativeEbitdaOk,
        ebitdaMin: parseNum(form.ebitdaMin),
        ebitdaMax: parseNum(form.ebitdaMax),
        evMin: parseNum(form.evMin),
        evMax: parseNum(form.evMax),
        equityCheckMin: parseNum(form.equityCheckMin),
        equityCheckMax: parseNum(form.equityCheckMax),
        sectorCriteria: form.sectorCriteria.trim() || null,
        geoCriteria: form.geoCriteria.trim() || null,
      } as Partial<PEFirm>,
      {
        onSuccess: () => {
          toast.success('Investment criteria saved.');
          setEditing(false);
        },
        onError: () => toast.error('Could not save criteria.'),
      },
    );
  };

  return (
    <div className="pfd-card">
      <div className="pfd-card__head">
        <h2 className="pfd-card__title">
          <i className="bi bi-bullseye" aria-hidden="true" />
          Investment Criteria
        </h2>
        {isStaff &&
          (!editing ? (
            <Button variant="popup-secondary" onClick={openEdit}>
              <i className="bi bi-pencil me-1" aria-hidden="true" />
              Edit
            </Button>
          ) : (
            <div className="d-flex gap-2">
              <Button variant="popup-secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateFirm.isPending}>
                Save
              </Button>
            </div>
          ))}
      </div>

      {!editing ? (
        <>
          <div className="pfd-criteria-grid">
            <div>
              <div className="pfd-criteria-item__label">Revenue</div>
              <div className="pfd-criteria-item__value">
                {rangeDisplay(firm.revMin, firm.revMax) ?? (
                  <span className="pfd-criteria-item__value--empty">Not set</span>
                )}
                {mark('revMin')}
              </div>
            </div>
            <div>
              <div className="pfd-criteria-item__label">EBITDA</div>
              <div className="pfd-criteria-item__value">
                {rangeDisplay(firm.ebitdaMin, firm.ebitdaMax) ?? (
                  <span className="pfd-criteria-item__value--empty">Not set</span>
                )}
                {mark('ebitdaMin')}
                {firm.negativeEbitdaOk ? ' · negative EBITDA OK' : ''}
              </div>
            </div>
            <div>
              <div className="pfd-criteria-item__label">Enterprise Value</div>
              <div className="pfd-criteria-item__value">
                {rangeDisplay(firm.evMin, firm.evMax) ?? (
                  <span className="pfd-criteria-item__value--empty">Not set</span>
                )}
                {mark('evMin')}
              </div>
            </div>
            <div>
              <div className="pfd-criteria-item__label">Equity Check</div>
              <div className="pfd-criteria-item__value">
                {rangeDisplay(firm.equityCheckMin, firm.equityCheckMax) ?? (
                  <span className="pfd-criteria-item__value--empty">Not set</span>
                )}
                {mark('equityCheckMin')}
              </div>
            </div>
          </div>

          <div className="pfd-criteria-text">
            <div className="pfd-criteria-item__label">Sector / Industry</div>
            <div className="pfd-criteria-text__row">
              <span className="pfd-criteria-text__tag">Stated</span>
              <span className="pfd-criteria-item__value">
                {firm.sectorCriteria ?? (
                  <span className="pfd-criteria-item__value--empty">Not set</span>
                )}
              </span>
            </div>
            {firm.sectorCriteriaInferred && (
              <div className="pfd-criteria-text__row">
                <span className="pfd-criteria-text__tag">Inferred</span>
                <span className="text-muted">{firm.sectorCriteriaInferred}</span>
              </div>
            )}
          </div>

          <div className="pfd-criteria-text">
            <div className="pfd-criteria-item__label">Geography</div>
            <div className="pfd-criteria-text__row">
              <span className="pfd-criteria-text__tag">Stated</span>
              <span className="pfd-criteria-item__value">
                {firm.geoCriteria ?? (
                  <span className="pfd-criteria-item__value--empty">Not set</span>
                )}
              </span>
            </div>
            {firm.geoCriteriaInferred && (
              <div className="pfd-criteria-text__row">
                <span className="pfd-criteria-text__tag">Inferred</span>
                <span className="text-muted">{firm.geoCriteriaInferred}</span>
              </div>
            )}
          </div>

          {firm.sizeCriteriaSource && (
            <p className="pfd-criteria-source">Source: {firm.sizeCriteriaSource}</p>
          )}
        </>
      ) : (
        <div className="pfd-criteria-edit">
          <div className="pfd-criteria-grid">
            {(['Revenue', 'EBITDA', 'Enterprise Value', 'Equity Check'] as const).map((label) => {
              const keys = {
                Revenue: ['revMin', 'revMax'] as const,
                EBITDA: ['ebitdaMin', 'ebitdaMax'] as const,
                'Enterprise Value': ['evMin', 'evMax'] as const,
                'Equity Check': ['equityCheckMin', 'equityCheckMax'] as const,
              };
              const [minKey, maxKey] = keys[label];
              return (
                <div key={label}>
                  <div className="pfd-criteria-item__label">{label} ($M)</div>
                  <div className="d-flex gap-1 align-items-center">
                    <input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className="form-control form-control-sm"
                      value={form[minKey]}
                      onChange={(e) => setForm((f) => ({ ...f, [minKey]: e.target.value }))}
                    />
                    <span className="text-muted small">–</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className="form-control form-control-sm"
                      value={form[maxKey]}
                      onChange={(e) => setForm((f) => ({ ...f, [maxKey]: e.target.value }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="form-check mt-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="pfd-neg-ebitda"
              checked={form.negativeEbitdaOk}
              onChange={(e) => setForm((f) => ({ ...f, negativeEbitdaOk: e.target.checked }))}
            />
            <label className="form-check-label" htmlFor="pfd-neg-ebitda">
              Negative EBITDA acceptable
            </label>
          </div>
          <div className="row mt-3 g-3">
            <div className="col-sm-6">
              <label className="form-label small text-muted" htmlFor="pfd-sector-criteria">
                Sector / Industry Criteria
              </label>
              <input
                id="pfd-sector-criteria"
                className="form-control form-control-sm"
                placeholder="e.g. Healthcare, Technology, B2B SaaS…"
                value={form.sectorCriteria}
                onChange={(e) => setForm((f) => ({ ...f, sectorCriteria: e.target.value }))}
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label small text-muted" htmlFor="pfd-geo-criteria">
                Geography Criteria
              </label>
              <input
                id="pfd-geo-criteria"
                className="form-control form-control-sm"
                placeholder="e.g. North America, US Southeast…"
                value={form.geoCriteria}
                onChange={(e) => setForm((f) => ({ ...f, geoCriteria: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Team Memory card ────────────────────────────────────────────────────────
function TeamMemoryCard({ firmName }: { firmName: string }) {
  const toast = useToast();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const firmKey = normalizeFirmKey(firmName);

  const memoryQuery = useQuery({
    queryKey: ['firm-memory', firmKey],
    queryFn: () => firmMemoryService.get(firmKey).catch(() => null),
    retry: false,
  });

  const upsert = useMutation({
    mutationFn: (input: { firmName: string; notes: string }) =>
      firmMemoryService.upsert({ firmName: input.firmName, teamNotes: input.notes }),
    onSuccess: () => {
      toast.success('Team notes saved.');
      setEditing(false);
      setNotes(null);
      void memoryQuery.refetch();
    },
    onError: () => toast.error('Could not save team notes.'),
  });

  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);

  const mem: FirmMemory | null = memoryQuery.data ?? null;
  const currentNotes = notes !== null ? notes : (mem?.team_notes ?? '');

  if (memoryQuery.isLoading) return null;

  return (
    <div className="pfd-card">
      <div className="pfd-card__head">
        <h2 className="pfd-card__title">
          <i className="bi bi-stars" aria-hidden="true" />
          Team Memory
        </h2>
        {isStaff && !editing && (
          <Button variant="popup-secondary" onClick={() => setEditing(true)}>
            <i className="bi bi-pencil me-1" aria-hidden="true" />
            Edit notes
          </Button>
        )}
      </div>
      <p className="small text-muted mb-3">
        Collective intelligence your team has built about this firm. Automatically injected into AI
        scoring when this firm appears as a buyer.
      </p>

      <div className="pfd-criteria-item__label">Team notes</div>
      {editing ? (
        <div>
          <textarea
            className="form-control mb-2"
            rows={4}
            placeholder="Add observations about this firm's actual behavior, deal preferences, key contacts, red flags…"
            value={currentNotes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="d-flex gap-2">
            <Button
              onClick={() => upsert.mutate({ firmName, notes: currentNotes })}
              disabled={upsert.isPending}
            >
              Save
            </Button>
            <Button
              variant="popup-secondary"
              onClick={() => {
                setEditing(false);
                setNotes(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="small text-muted fst-italic">
          {currentNotes.trim() ||
            (isStaff
              ? "No team notes yet. Click 'Edit notes' to add observations about this firm."
              : 'No team notes yet.')}
        </p>
      )}
    </div>
  );
}

// ── Deal-flow card ──────────────────────────────────────────────────────────
function DealFlowCard({ firmId }: { firmId: string }) {
  const {
    data: signals,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['pe', 'signals', 'firm', firmId],
    queryFn: () => peSignalsService.getFirmSignals(firmId),
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading || isError || !signals) return null;

  const { appetite, rollups } = signals;

  return (
    <div className="pfd-card">
      <div className="pfd-card__head">
        <h2 className="pfd-card__title">
          <i className="bi bi-graph-up-arrow" aria-hidden="true" />
          Deal-Flow Intelligence
        </h2>
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">Acquisition appetite</span>
          <AppetiteBadge tier={appetite.tier} score={appetite.score} reasons={appetite.reasons} />
        </div>
      </div>

      <div className="pfd-deal-tiles">
        <div className="pfd-deal-tile">
          <div className="pfd-deal-tile__label">New (2y)</div>
          <div className="pfd-deal-tile__value">{appetite.last2yInvestments ?? '—'}</div>
        </div>
        <div className="pfd-deal-tile">
          <div className="pfd-deal-tile__label">Exits (2y)</div>
          <div className="pfd-deal-tile__value">{appetite.exits2y ?? '—'}</div>
        </div>
        <div className="pfd-deal-tile">
          <div className="pfd-deal-tile__label">New-deal score</div>
          <div className="pfd-deal-tile__value">{appetite.newInvestmentScore ?? '—'}</div>
        </div>
        <div className="pfd-deal-tile">
          <div className="pfd-deal-tile__label">Exit-activity score</div>
          <div className="pfd-deal-tile__value">{appetite.exitActivityScore ?? '—'}</div>
        </div>
      </div>

      {/* Roll-up patterns */}
      {rollups.length > 0 ? (
        <div className="pfd-rollups">
          <div className="pfd-rollups__head">
            <i className="bi bi-diagram-3" aria-hidden="true" />
            <h3 className="pfd-rollups__title">Roll-up patterns</h3>
            <span className="small text-muted">
              {rollups.length} sector cluster{rollups.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="pfd-rollups__grid">
            {rollups.map((ru) => (
              <div key={ru.sector} className="pfd-rollup-card">
                <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                  <span className="fw-medium small">{ru.sector}</span>
                  {ru.active ? (
                    <span className="badge bg-success-subtle text-success-emphasis border-success-subtle border">
                      Active roll-up
                    </span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary-emphasis border">
                      Dormant
                    </span>
                  )}
                </div>
                <div className="small text-muted">
                  {ru.totalDeals} deals · {ru.currentCount} current · {ru.exitedCount} exited
                  {ru.firstYear ? ` · since ${ru.firstYear}` : ''}
                </div>
                {ru.platform && (
                  <div className="small mt-1">
                    <span className="text-muted">Platform: </span>
                    <span className="fw-medium">{ru.platform.companyName ?? 'Unknown'}</span>
                    {ru.platform.year ? ` (${ru.platform.year})` : ''}
                  </div>
                )}
                {ru.addOns.length > 0 && (
                  <div className="small text-muted mt-1">
                    Add-ons:{' '}
                    {ru.addOns
                      .slice(0, 4)
                      .map((a) => a.companyName ?? '?')
                      .join(', ')}
                    {ru.addOns.length > 4 ? ` +${ru.addOns.length - 4} more` : ''}
                  </div>
                )}
                {ru.nextAddOnProfile && (
                  <div className="pfd-rollup-next mt-2">
                    <span className="fw-medium">Next add-on profile: </span>
                    <span>
                      {ru.nextAddOnProfile.sector}
                      {ru.nextAddOnProfile.geography ? ` · ${ru.nextAddOnProfile.geography}` : ''}
                    </span>
                    {ru.nextAddOnProfile.note && (
                      <div className="mt-1" style={{ opacity: 0.8 }}>
                        {ru.nextAddOnProfile.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="small text-muted mt-3">
          No roll-up patterns detected — needs at least 3 deals clustered in one sector.
        </p>
      )}
    </div>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────────
function Overview({ firm }: { firm: PEFirm }) {
  return (
    <dl className="row">
      <dt className="col-sm-3">Website</dt>
      <dd className="col-sm-9">
        <a href={firm.websiteUrl} target="_blank" rel="noreferrer">
          {firm.websiteUrl}
        </a>
      </dd>
      <dt className="col-sm-3">Portfolio page</dt>
      <dd className="col-sm-9">{firm.portfolioUrl ?? '—'}</dd>
      <dt className="col-sm-3">Status</dt>
      <dd className="col-sm-9">{firm.status}</dd>
      <dt className="col-sm-3">Holdings</dt>
      <dd className="col-sm-9">{firm.holdingsCount}</dd>
      <dt className="col-sm-3">People</dt>
      <dd className="col-sm-9">{firm.peopleCount}</dd>
      <dt className="col-sm-3">Last scraped</dt>
      <dd className="col-sm-9">
        {firm.lastScrapedAt ? formatDateTimeShort(firm.lastScrapedAt) : 'Never'} ({firm.freshness})
      </dd>
    </dl>
  );
}

/** F60 §4 Auto-Enrichment coverage panel — URL / GICS / Location tiles + Run Enrichment. */
function EnrichmentStatusCard({ firmId }: { firmId: string }) {
  const toast = useToast();
  const qc = useQueryClient();

  const enrichmentStatus = useQuery({
    queryKey: peFirmKeys.enrichmentStatus(firmId),
    queryFn: () => peService.firmEnrichmentStatus(firmId),
    enabled: !!firmId,
  });

  const enrich = useMutation({
    mutationFn: () => peService.enrichFirm(firmId),
    onSuccess: (r) => {
      toast.success(r.message || 'Enrichment queued.');
      void qc.invalidateQueries({ queryKey: peFirmKeys.enrichmentStatus(firmId) });
    },
    onError: () => toast.error('Could not queue enrichment.'),
  });

  const status: PEEnrichmentStatus | undefined = enrichmentStatus.data;
  if (!status || status.total === 0) return null;

  const busy = enrich.isPending || status.activeJobs.length > 0;

  return (
    <div className="pfd-card" data-testid="pe-enrichment-status">
      <div className="pfd-card__head">
        <h2 className="pfd-card__title pfd-card__title--enrich">
          <i className="bi bi-lightning-fill" aria-hidden="true" />
          Auto-Enrichment
        </h2>
        <Button
          variant="popup-secondary"
          onClick={() => enrich.mutate()}
          disabled={busy}
          data-testid="pe-run-enrich"
        >
          Run Enrichment
        </Button>
      </div>
      <div className="pfd-enrich-grid">
        <div>
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>URL Lookup</span>
            <span>
              {status.urlAttempted}/{status.total}
            </span>
          </div>
          <div className="small text-muted">{status.urlEnriched} found</div>
        </div>
        <div>
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>GICS Classify</span>
            <span>
              {status.gicsAttempted}/{status.total}
            </span>
          </div>
          <div className="small text-muted">{status.gicsEnriched} found</div>
        </div>
        <div>
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>Location</span>
            <span>
              {status.locationAttempted}/{status.total}
            </span>
          </div>
          <div className="small text-muted">{status.locationEnriched} found</div>
        </div>
      </div>
    </div>
  );
}

// ── Edit firm modal (CU.5) ──────────────────────────────────────────────────
const editFirmSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  websiteUrl: z.string().min(1, 'Website URL is required').url('Enter a full URL (https://…)'),
  portfolioUrl: z.union([z.literal(''), z.string().url('Enter a full URL (https://…)')]),
  teamPageUrl: z.union([z.literal(''), z.string().url('Enter a full URL (https://…)')]),
  sectorCriteria: z.string(),
  geoCriteria: z.string(),
  description: z.string(),
});
type EditFirmValues = z.infer<typeof editFirmSchema>;

function EditFirmModal({
  firm,
  open,
  onClose,
}: {
  firm: PEFirm;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFirmValues>({
    resolver: zodResolver(editFirmSchema),
    defaultValues: {
      name: firm.name,
      websiteUrl: firm.websiteUrl ?? '',
      portfolioUrl: firm.portfolioUrl ?? '',
      teamPageUrl: firm.teamPageUrl ?? '',
      sectorCriteria: firm.sectorCriteria ?? '',
      geoCriteria: firm.geoCriteria ?? '',
      description: firm.description ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: firm.name,
        websiteUrl: firm.websiteUrl ?? '',
        portfolioUrl: firm.portfolioUrl ?? '',
        teamPageUrl: firm.teamPageUrl ?? '',
        sectorCriteria: firm.sectorCriteria ?? '',
        geoCriteria: firm.geoCriteria ?? '',
        description: firm.description ?? '',
      });
    }
  }, [open, firm, reset]);

  const save = useMutation({
    mutationFn: (values: EditFirmValues) => {
      const nullable = (s: string) => (s.trim() ? s.trim() : null);
      return peService.updateFirm(firm.id, {
        name: values.name.trim(),
        websiteUrl: values.websiteUrl.trim(),
        portfolioUrl: nullable(values.portfolioUrl),
        teamPageUrl: nullable(values.teamPageUrl),
        sectorCriteria: nullable(values.sectorCriteria),
        geoCriteria: nullable(values.geoCriteria),
        description: nullable(values.description),
      });
    },
    onSuccess: (updated) => {
      toast.success('Firm updated.');
      queryClient.setQueryData(['pe', 'firm', firm.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['pe', 'firms'] });
      onClose();
    },
    onError: () => toast.error('Could not update the firm (host already in use?).'),
  });

  const field = (
    id: string,
    label: string,
    name: keyof EditFirmValues,
    type: 'text' | 'url' = 'text',
  ) => (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="form-control"
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${id}-error` : undefined}
        {...register(name)}
      />
      {errors[name] && (
        <div id={`${id}-error`} className="text-danger small mt-1" role="alert">
          {errors[name]?.message}
        </div>
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${firm.name}`} size="lg">
      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        {field('pe-edit-name', 'Name', 'name')}
        {field('pe-edit-website', 'Website URL', 'websiteUrl', 'url')}
        {field('pe-edit-portfolio', 'Portfolio page URL', 'portfolioUrl', 'url')}
        {field('pe-edit-team', 'Team page URL', 'teamPageUrl', 'url')}
        {field('pe-edit-sector', 'Sector focus', 'sectorCriteria')}
        {field('pe-edit-geo', 'Geography', 'geoCriteria')}
        <div className="mb-3">
          <label className="form-label" htmlFor="pe-edit-description">
            Description
          </label>
          <textarea
            id="pe-edit-description"
            className="form-control"
            rows={3}
            {...register('description')}
          />
        </div>
        <div className="d-flex gap-2 justify-content-end">
          <Button variant="popup-secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending} loading={save.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Portfolio URLs panel (CU.5) ─────────────────────────────────────────────
function PortfolioUrlsPanel({ firmId }: { firmId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState<string | null>(null);

  const urlsQuery = useQuery({
    queryKey: ['pe', 'firm', firmId, 'portfolio-urls'],
    queryFn: () => peService.getPortfolioUrls(firmId),
  });

  const save = useMutation({
    mutationFn: (urls: string[]) => peService.setPortfolioUrls(firmId, urls),
    onSuccess: (urls) => {
      toast.success(`Portfolio URLs saved (${urls.length}).`);
      setText(null);
      void queryClient.invalidateQueries({
        queryKey: ['pe', 'firm', firmId, 'portfolio-urls'],
      });
    },
    onError: () => toast.error('Could not save the portfolio URLs.'),
  });

  if (urlsQuery.isPending) return <Spinner />;
  const current = urlsQuery.data ?? [];
  const value = text ?? current.join('\n');
  const urls = value
    .split(/\n+/)
    .map((u) => u.trim())
    .filter(Boolean);

  return (
    <section className="mt-4" aria-labelledby="pe-portfolio-urls-heading">
      <h2 id="pe-portfolio-urls-heading" className="h5">
        Portfolio page URLs
      </h2>
      <label className="form-label" htmlFor="pe-portfolio-urls">
        One URL per line. Saving <strong>replaces the whole list</strong> — remove a line to drop
        that URL.
      </label>
      <textarea
        id="pe-portfolio-urls"
        className="form-control mb-2"
        rows={4}
        value={value}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="d-flex gap-2">
        <Button
          disabled={text === null || save.isPending}
          loading={save.isPending}
          onClick={() => save.mutate(urls)}
        >
          Save URLs
        </Button>
        {text !== null && (
          <Button variant="popup-secondary" onClick={() => setText(null)}>
            Discard changes
          </Button>
        )}
      </div>
    </section>
  );
}

// ── Criteria tab content ────────────────────────────────────────────────────
function Criteria({ firm }: { firm: PEFirm }) {
  const derived = new Set((firm.sizeCriteriaDerived ?? '').split(',').filter(Boolean));
  const mark = (key: string) => (derived.has(key) ? ' (estimated)' : '');
  return (
    <>
      <dl className="row">
        <dt className="col-sm-3">Revenue</dt>
        <dd className="col-sm-9">
          {rangeDisplay(firm.revMin, firm.revMax) ?? '—'}
          {mark('revMin')}
        </dd>
        <dt className="col-sm-3">EBITDA</dt>
        <dd className="col-sm-9">
          {rangeDisplay(firm.ebitdaMin, firm.ebitdaMax) ?? '—'}
          {mark('ebitdaMin')}
          {firm.negativeEbitdaOk ? ' · negative EBITDA OK' : ''}
        </dd>
        <dt className="col-sm-3">Enterprise value</dt>
        <dd className="col-sm-9">
          {rangeDisplay(firm.evMin, firm.evMax) ?? '—'}
          {mark('evMin')}
        </dd>
        <dt className="col-sm-3">Equity check</dt>
        <dd className="col-sm-9">
          {rangeDisplay(firm.equityCheckMin, firm.equityCheckMax) ?? '—'}
          {mark('equityCheckMin')}
        </dd>
        <dt className="col-sm-3">Sector focus</dt>
        <dd className="col-sm-9">
          {firm.sectorCriteria ?? '—'}
          {firm.sectorCriteriaInferred && (
            <span className="text-muted"> · revealed: {firm.sectorCriteriaInferred}</span>
          )}
        </dd>
        <dt className="col-sm-3">Geography</dt>
        <dd className="col-sm-9">
          {firm.geoCriteria ?? '—'}
          {firm.geoCriteriaInferred && (
            <span className="text-muted"> · revealed: {firm.geoCriteriaInferred}</span>
          )}
        </dd>
      </dl>
      {firm.sizeCriteriaSource && (
        <p className="text-muted small">Source: {firm.sizeCriteriaSource}</p>
      )}
    </>
  );
}

// ── Scrape history ──────────────────────────────────────────────────────────
const SCRAPE_COLUMNS: BaseTableColumn<PEScrapeJob>[] = [
  {
    key: 'jobType',
    header: 'Type',
    render: (j) => (
      <span className="badge bg-secondary-subtle text-secondary-emphasis border">{j.jobType}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (j) => {
      const tone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
        completed: 'success',
        running: 'info',
        pending: 'warning',
        failed: 'danger',
        error: 'danger',
      };
      return <Badge tone={tone[j.status] ?? 'secondary'}>{j.status}</Badge>;
    },
  },
  {
    key: 'trigger',
    header: 'Trigger',
    render: (j) => <span className="text-muted small">{j.trigger}</span>,
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (j) => <span className="small">{formatDateTimeShort(j.createdAt)}</span>,
  },
  {
    key: 'completedAt',
    header: 'Completed',
    render: (j) => (
      <span className="small text-muted">
        {j.completedAt ? formatDateTimeShort(j.completedAt) : '—'}
      </span>
    ),
  },
  {
    key: 'errorMessage',
    header: 'Error',
    render: (j) =>
      j.errorMessage ? (
        <span className="text-danger small">{j.errorMessage}</span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
];

function ScrapeHistory({ jobs }: { jobs: PEScrapeJob[] }) {
  return (
    <BaseTable
      columns={SCRAPE_COLUMNS}
      rows={jobs}
      getRowKey={(j) => j.id}
      emptyMessage="No scrape history available."
    />
  );
}

// ── Firm people tab ─────────────────────────────────────────────────────────
function FirmPeople({ firmId }: { firmId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const scrapePeople = useMutation({
    mutationFn: () => peService.scrapePeople(firmId),
    onSuccess: (r) => {
      toast.success(r.message || 'People scrape queued.');
      void queryClient.invalidateQueries({
        queryKey: ['pe', 'firm', firmId],
      });
    },
    onError: () => toast.error('Could not queue the people scrape.'),
  });

  return (
    <div>
      {isStaff && (
        <div className="d-flex justify-content-end mb-3">
          <Button
            variant="popup-secondary"
            disabled={scrapePeople.isPending}
            onClick={() => scrapePeople.mutate()}
          >
            {scrapePeople.isPending ? 'Queuing…' : 'Scrape people'}
          </Button>
        </div>
      )}
      <PeopleTable firmId={firmId} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PEFirmDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const [tab, setTab] = useState('holdings');
  const [editOpen, setEditOpen] = useState(false);

  const visibleTabs = useMemo(
    () => (isStaff ? TABS : TABS.filter((t) => t.id !== 'scrapes')),
    [isStaff],
  );

  const firmQuery = useQuery({
    queryKey: ['pe', 'firm', id],
    queryFn: () => peService.getFirm(id),
    enabled: !!id,
  });

  // Header stats (current/realized/avg hold) need the firm's full book.
  // API max pageSize is 200 — use export=true (up to 50k) instead of an invalid 500.
  const holdingsQuery = useQuery({
    queryKey: ['pe', 'holdings', 'summary', id],
    queryFn: () => peService.listHoldings({ firmId: id, export: true }),
    enabled: !!id,
    retry: false,
  });

  const jobsQuery = useQuery({
    queryKey: ['pe', 'firm', id, 'scrape-jobs'],
    queryFn: () => peService.getScrapeJobs(id),
    enabled: !!id && tab === 'scrapes',
  });

  const { currentCount, realizedCount, unknownCount, avgHoldPeriod, pendingReviewCount } =
    useMemo(() => {
      let current = 0;
      let realized = 0;
      let unknown = 0;
      let pending = 0;
      const thisYear = new Date().getFullYear();
      let holdSum = 0;
      let holdCount = 0;
      for (const h of holdingsQuery.data?.holdings ?? []) {
        if (h.pendingReview) pending++;
        const status = (h.investmentStatus ?? '').toLowerCase().trim();
        if (status === 'current') {
          current++;
          const yearMatch = (h.investmentDate ?? '').match(/\b(19|20)\d{2}\b/);
          if (yearMatch) {
            const year = parseInt(yearMatch[0], 10);
            if (year <= thisYear) {
              holdSum += thisYear - year;
              holdCount++;
            }
          }
        } else if (status === 'realized') {
          realized++;
        } else {
          // null / empty / "unknown" / any other unrecognized value → Unknown (not Current).
          unknown++;
        }
      }
      return {
        currentCount: current,
        realizedCount: realized,
        unknownCount: unknown,
        avgHoldPeriod: holdCount > 0 ? holdSum / holdCount : null,
        pendingReviewCount: pending,
      };
    }, [holdingsQuery.data]);

  const scrape = useMutation({
    mutationFn: () => peService.scrapeFirm(id),
    onSuccess: (r) => {
      toast.success(r.message || 'Scrape queued.');
      void queryClient.invalidateQueries({ queryKey: peFirmKeys.firm(id) });
      void queryClient.invalidateQueries({ queryKey: peFirmKeys.enrichmentStatus(id) });
    },
    onError: () => toast.error('Could not queue the scrape.'),
  });

  const pauseResume = useMutation({
    mutationFn: () => {
      const isPaused =
        firmQuery.data?.status === 'paused' ||
        firmQuery.data?.status === 'quarantined' ||
        firmQuery.data?.status === 'error';
      const newStatus = isPaused ? 'active' : 'paused';
      return peService.updateFirm(id, { status: newStatus });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(peFirmKeys.firm(id), updated);
      void queryClient.invalidateQueries({ queryKey: peFirmKeys.all });
      const resumed = updated.status === 'active';
      toast.success(resumed ? 'Firm activated.' : 'Firm paused.');
    },
    onError: () => toast.error('Could not update the firm status.'),
  });

  if (firmQuery.isPending) {
    return (
      <div className="pfd-page text-center py-5">
        <Spinner />
      </div>
    );
  }
  if (firmQuery.isError || !firmQuery.data) {
    return (
      <div className="pfd-page">
        <p>Firm not found.</p>
        <Link to={paths.pe.firms}>Back to firms</Link>
      </div>
    );
  }
  const firm = firmQuery.data;

  return (
    <div className="pfd-page">
      {/* 1. Back link */}
      <Link to={paths.pe.firms} className="pfd-back">
        ← All firms
      </Link>

      {/* 2. Header card */}
      <HeaderCard
        firm={firm}
        currentCount={currentCount}
        realizedCount={realizedCount}
        unknownCount={unknownCount}
        avgHoldPeriod={avgHoldPeriod}
        holdingsLoading={holdingsQuery.isLoading}
        onEdit={() => setEditOpen(true)}
        onPauseResume={() => pauseResume.mutate()}
        onScrape={() => scrape.mutate()}
        scrapePending={scrape.isPending}
        pausePending={pauseResume.isPending}
      />

      {/* 3. Investment Criteria card */}
      <CriteriaCard firm={firm} />

      {/* 3b. Auto-Enrichment coverage (F60 §4) */}
      {isStaff && <EnrichmentStatusCard firmId={id} />}

      {/* 4. Team Memory card */}
      <TeamMemoryCard firmName={firm.name} />

      {/* 5. Pending review banner */}
      {isStaff && pendingReviewCount > 0 && (
        <div className="pfd-pending-banner">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>
            {pendingReviewCount} holding{pendingReviewCount !== 1 ? 's' : ''} from this firm&apos;s
            first scrape are awaiting review.
          </span>
          <Link to={paths.pe.reviewQueue} className="pfd-pending-banner__link">
            Open Review Queue →
          </Link>
        </div>
      )}

      {/* 6. Deal-Flow Intelligence card */}
      <DealFlowCard firmId={id} />

      {/* 7. Tabs */}
      <Tabs tabs={visibleTabs} active={tab} onChange={setTab} />

      <div className="mt-3">
        {tab === 'overview' && (
          <>
            <Overview firm={firm} />
            {isStaff && <PortfolioUrlsPanel firmId={id} />}
          </>
        )}
        {tab === 'holdings' && <HoldingsTable firmId={id} />}
        {tab === 'people' && <FirmPeople firmId={id} />}
        {tab === 'criteria' && <Criteria firm={firm} />}
        {tab === 'scrapes' &&
          isStaff &&
          (jobsQuery.isPending ? <Spinner /> : <ScrapeHistory jobs={jobsQuery.data ?? []} />)}
        {tab === 'signals' && <FirmSignalsTab firmId={id} />}
      </div>

      <EditFirmModal firm={firm} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
