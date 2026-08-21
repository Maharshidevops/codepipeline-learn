import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { usageService } from '@/services/api';
import { isApiError } from '@/lib/authErrors';
import { useToast } from '@/hooks/useToast';
import type { UsagePricingProviderRow } from '@/types';
import { usageKeys } from '../usageKeys';

function draftFlat(rows: UsagePricingProviderRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    out[r.key] = r.isCustom ? String(r.costUsd) : '';
  }
  return out;
}

export function AdvancePricingPanel() {
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [flatDrafts, setFlatDrafts] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: usageKeys.pricing(),
    queryFn: () => usageService.getPricing(),
    enabled: open,
    staleTime: 60_000,
  });

  const canEdit = Boolean(data?.canEdit);
  const llmRows = data?.llmProviders ?? [];
  const providerRows = data?.providers ?? [];

  useEffect(() => {
    if (!data) return;
    setFlatDrafts(draftFlat(data.providers));
  }, [data]);

  const dirty = useMemo(() => {
    if (!data) return false;
    for (const r of data.providers) {
      const d = (flatDrafts[r.key] ?? '').trim();
      const cur = r.isCustom ? String(r.costUsd) : '';
      if (d !== cur) return true;
    }
    return false;
  }, [data, flatDrafts]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const providerCostUsd: Record<string, number | null> = {};
      for (const r of providerRows) {
        const raw = (flatDrafts[r.key] ?? '').trim();
        if (!raw) {
          providerCostUsd[r.key] = null;
          continue;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) throw new Error(`${r.label} rate must be >= 0`);
        providerCostUsd[r.key] = n;
      }
      // LLM token rates are platform-managed (model list / discounts change) — not editable.
      return usageService.setPricing({ providerCostUsd });
    },
    onSuccess: async () => {
      toast.success('Advance Pricing saved for this organization.');
      await qc.invalidateQueries({ queryKey: usageKeys.pricing() });
    },
    onError: (err: unknown) => {
      const msg = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Unable to save Advance Pricing.';
      toast.error(msg);
    },
  });

  const resetAll = () => {
    if (!data) return;
    const flatEmpty: Record<string, string> = {};
    for (const r of data.providers) flatEmpty[r.key] = '';
    setFlatDrafts(flatEmpty);
  };

  return (
    <div
      className="usage-card usage-section-gap usage-advance-pricing"
      data-testid="usage-advance-pricing"
    >
      <button
        type="button"
        className="usage-collapse-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="usage-advance-pricing-toggle"
      >
        <div className="usage-collapse-left">
          <Settings2 />
          <span className="usage-collapse-label">Advance Pricing</span>
        </div>
        {open ? (
          <ChevronUp className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        ) : (
          <ChevronDown className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        )}
      </button>

      {open ? (
        <div className="usage-collapse-body">
          <p className="usage-collapse-hint">
            Rates used to estimate API costs for this organization. LLM token rates are
            platform-managed (model pricing and discounts) and shown for reference. Other provider
            rates can be overridden — leave a field blank for the platform default. Custom rates
            apply to future runs only.
            {!canEdit && data ? ' Organization admins can edit other provider rates.' : ''}
          </p>

          {isLoading && !data ? (
            <div className="usage-card-skeleton">
              {[1, 2, 3].map((i) => (
                <span key={i} className="usage-skel" style={{ height: 36 }} />
              ))}
            </div>
          ) : isError ? (
            <div className="usage-card-empty text-danger">Unable to load Advance Pricing.</div>
          ) : (
            <>
              <div className="usage-pricing-section">
                <h3 className="usage-pricing-heading">LLM token rates ($ / 1M tokens)</h3>
                <p className="usage-pricing-note">View only — not editable per organization.</p>
                <div className="usage-scroll usage-scroll--budget">
                  <div className="usage-grid-head usage-pricing-llm-head">
                    <span>Provider</span>
                    <span>Input</span>
                    <span>Output</span>
                  </div>
                  {llmRows.map((r) => (
                    <div
                      key={r.key}
                      className="usage-grid-row usage-pricing-llm-row"
                      data-testid={`pricing-llm-${r.key}`}
                    >
                      <p className="usage-list-primary">{r.label}</p>
                      <span className="usage-pricing-value">{r.input}</span>
                      <span className="usage-pricing-value">{r.output}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="usage-pricing-section">
                <h3 className="usage-pricing-heading">Other provider rates (USD)</h3>
                <div className="usage-scroll usage-scroll--budget">
                  <div className="usage-grid-head usage-pricing-flat-head">
                    <span>Provider</span>
                    <span>Default</span>
                    <span>Your rate</span>
                    <span>Unit</span>
                  </div>
                  {providerRows.map((r) => (
                    <div
                      key={r.key}
                      className="usage-grid-row usage-pricing-flat-row"
                      data-testid={`pricing-provider-${r.key}`}
                    >
                      <div>
                        <p className="usage-list-primary">{r.label}</p>
                        {r.isCustom ? (
                          <p className="usage-list-secondary">Custom</p>
                        ) : (
                          <p className="usage-list-secondary">Using default</p>
                        )}
                      </div>
                      <span className="usage-pricing-value">${r.defaultCostUsd}</span>
                      <div>
                        {canEdit ? (
                          <>
                            <label className="visually-hidden" htmlFor={`flat-${r.key}`}>
                              Rate for {r.label}
                            </label>
                            <div className="usage-cap-input-wrap">
                              <span className="usage-dollar">$</span>
                              <input
                                id={`flat-${r.key}`}
                                className="usage-cap-input"
                                inputMode="decimal"
                                placeholder={String(r.defaultCostUsd)}
                                value={flatDrafts[r.key] ?? ''}
                                onChange={(e) =>
                                  setFlatDrafts((prev) => ({ ...prev, [r.key]: e.target.value }))
                                }
                                data-testid={`pricing-provider-input-${r.key}`}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="usage-pricing-value">${r.costUsd}</span>
                        )}
                      </div>
                      <span className="usage-pricing-unit">per {r.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {canEdit ? (
                <div className="usage-pricing-actions">
                  <button
                    type="button"
                    className="usage-cancel-btn"
                    onClick={resetAll}
                    disabled={saveMut.isPending}
                    data-testid="pricing-reset"
                  >
                    Clear to defaults
                  </button>
                  <button
                    type="button"
                    className="usage-save-btn"
                    onClick={() => saveMut.mutate()}
                    disabled={saveMut.isPending || !dirty}
                    data-testid="pricing-save"
                  >
                    {saveMut.isPending ? 'Saving…' : 'Save rates'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
