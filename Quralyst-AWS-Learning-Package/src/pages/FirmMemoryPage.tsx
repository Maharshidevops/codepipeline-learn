// FirmMemoryPage (/financial-verticals/firm-memory) — Tier A / A4. Manage per-PE-firm notes the org
// keeps about EXTERNAL private-equity firms. Whatever is saved here is injected into Financial
// Verticals scoring when that firm is scored, so buyer-list fit reflects what the team knows about
// each buyer. Distinct from A3 Org Memory (what *this* org wants) — this is what *each buyer* wants.
//
// Reference-parity rewrite (2026-07-29): one freeform Team notes field replaces the five structured
// mandate inputs, and the "Recompute from portfolio history" action is gone — learning is now signal
// capture, written by the backend from real analyst activity (fit overrides, deal outcomes, outreach,
// mined commentary). Those signals are read-only and shown in an expandable sub-row.
import { useEffect, useState, type FormEvent } from 'react';
import { Spinner, BaseTable } from '@/components/ui';
import {
  firmMemoryService,
  signalCount,
  SIGNAL_LISTS,
  SIGNAL_LABELS,
  type FirmMemory,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';

const MAX_NOTES = 4000;

const EMPTY_FORM = { firmName: '', teamNotes: '', website: '' };

// Full-width sub-row cell must escape the same global fixed-width rule.
const SUBROW: React.CSSProperties = {
  width: 'auto',
  minWidth: 0,
  maxWidth: 'none',
  overflow: 'visible',
  cursor: 'default',
};

export default function FirmMemoryPage() {
  const toast = useToast();
  const [firms, setFirms] = useState<FirmMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  // Which firm's captured signals are expanded (only one at a time — they can be long).
  const [openSignals, setOpenSignals] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    firmMemoryService
      .list()
      .then(setFirms)
      .catch((e) =>
        toast.error((e as { message?: string })?.message ?? 'Failed to load firm memory.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingKey(null);
  };

  const startEdit = (m: FirmMemory) => {
    setEditingKey(m.firm_key);
    setForm({
      firmName: m.firm_name,
      teamNotes: m.team_notes ?? '',
      website: m.firm_website ?? '',
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firmName.trim()) {
      toast.error('Firm name is required.');
      return;
    }
    setSaving(true);
    try {
      const { message } = await firmMemoryService.upsert({
        firmName: form.firmName.trim(),
        teamNotes: form.teamNotes,
        website: form.website.trim(),
      });
      toast.success(message || 'Firm notes saved.');
      resetForm();
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to save firm notes.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (m: FirmMemory) => {
    try {
      const { message } = await firmMemoryService.remove(m.firm_key);
      toast.success(message || 'Firm notes cleared.');
      if (editingKey === m.firm_key) resetForm();
      if (openSignals === m.firm_key) setOpenSignals(null);
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to delete firm notes.');
    }
  };

  return (
    <>
      <div className="criteria-card criteria-card--white mb-3">
        <h3 className="api-keys-title mb-1">{editingKey ? 'Edit firm notes' : 'Add firm notes'}</h3>
        <p className="text-muted small mb-3">
          Record what a private-equity firm looks for. When you build a buyer list, Quralyst scores
          candidates against your notes on each firm — alongside whatever the system has observed
          from your team&apos;s own activity.
        </p>

        <form onSubmit={onSubmit}>
          <div className="row">
            <div className="col-md-7 mb-3">
              <label className="form-label" htmlFor="fm-firm-name">
                Firm name
              </label>
              <input
                id="fm-firm-name"
                type="text"
                className="form-control"
                placeholder="e.g. Vista Equity Partners"
                value={form.firmName}
                onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))}
                disabled={!!editingKey}
              />
              {editingKey && (
                <div className="form-text">
                  The firm name keys this record and cannot be changed here.
                </div>
              )}
            </div>
            <div className="col-md-5 mb-3">
              <label className="form-label" htmlFor="fm-website">
                Website <span className="text-muted">(optional)</span>
              </label>
              <input
                id="fm-website"
                type="text"
                className="form-control"
                placeholder="vistaequitypartners.com"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
              {/* The domain is the most reliable way to match this record to the PE dataset — a
                  shortened or differently-punctuated firm name can otherwise miss. */}
              <div className="form-text">Matches this firm to the PE dataset more reliably.</div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="fm-team-notes">
              Team notes
            </label>
            <textarea
              id="fm-team-notes"
              className="form-control"
              rows={5}
              maxLength={MAX_NOTES}
              placeholder={
                'Everything the team knows about this buyer, in your own words. For example:\n' +
                'Buys vertical SaaS with $10M+ ARR and recurring revenue. Avoids hardware and ' +
                'services. Prefers founder-led businesses in North America.'
              }
              value={form.teamNotes}
              onChange={(e) => setForm((f) => ({ ...f, teamNotes: e.target.value }))}
            />
            <div className="form-text">
              {form.teamNotes.length} / {MAX_NOTES} characters
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingKey ? 'Update notes' : 'Save notes'}
            </button>
            {editingKey && (
              <button
                type="button"
                className="btn btn-standard"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="criteria-card criteria-card--white">
        <h3 className="api-keys-title mb-3">Saved firm notes</h3>
        {loading ? (
          <div className="org-tab-loading">
            <Spinner />
          </div>
        ) : firms.length === 0 ? (
          <p className="text-muted mb-0">
            No firm notes yet. Add some above and they will guide Financial Verticals scoring for
            that firm.
          </p>
        ) : (
          <BaseTable<FirmMemory>
            columns={[
              {
                key: 'firm',
                header: 'Firm',
                width: '180px',
                cellClass: 'fw-semibold',
                render: (m) => (
                  <>
                    {m.firm_name || m.firm_key}
                    {m.firm_website ? (
                      <div className="text-muted small fw-normal">{m.firm_website}</div>
                    ) : null}
                  </>
                ),
              },
              {
                key: 'notes',
                header: 'Team notes',
                width: '320px',
                cellClass: 'text-muted small',
                render: (m) => (
                  <div
                    title={m.team_notes || ''}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {m.team_notes || '—'}
                  </div>
                ),
              },
              {
                key: 'signals',
                header: 'Observed',
                width: '140px',
                cellClass: 'small',
                render: (m) => {
                  const signals = signalCount(m);
                  return signals > 0 ? (
                    <span className="badge bg-secondary">
                      {signals} signal{signals === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="text-muted">none yet</span>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                width: '180px',
                render: (m) => (
                  <div className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-standard me-2"
                      onClick={() => setOpenSignals(openSignals === m.firm_key ? null : m.firm_key)}
                      disabled={signalCount(m) === 0}
                    >
                      {openSignals === m.firm_key ? 'Hide' : 'Signals'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-standard me-2"
                      onClick={() => startEdit(m)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => void onDelete(m)}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            rows={firms}
            getRowKey={(m) => m.firm_key}
            isRowExpanded={(m) => openSignals === m.firm_key}
            renderExpandedRow={(m) => (
              <td colSpan={4} style={SUBROW} className="bg-light p-3">
                <div className="d-flex flex-wrap gap-4">
                  {SIGNAL_LISTS.map((key) => {
                    const title = SIGNAL_LABELS[key];
                    const items = m[key] ?? [];
                    if (!items.length) return null;
                    return (
                      <div key={key} style={{ flex: '1 1 200px', minWidth: 200 }}>
                        <div className="fw-semibold small mb-1">{title}</div>
                        <ul className="list-unstyled small mb-0">
                          {items.map((item, i) => (
                            <li key={`${key}-${i}`} className="text-muted mb-1">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </td>
            )}
          />
        )}
      </div>
    </>
  );
}
