// Analyst Preferences (Tier A / A2 + A3 + A4). Two-tab page:
//   • "My Preferences" (personal scope) — the analyst's explicit scoring context + system-learned
//     signals. Always visible.
//   • "Firm Memory" (firm-wide scope) — the org thesis, team-learned deal patterns, and per-firm
//     notes. Admin-only: the tab switcher shows only to org owners/admins (orgCanEdit); everyone
//     else sees just the personal view with no tabs.
// The personal fields are injected into business-fit scoring after the Knowledge Bank block;
// system-learned fields render read-only (written by the app, not the user).
import { useEffect, useState, type FormEvent } from 'react';
import { Spinner } from '@/components/ui';
import { memoryService, orgMemoryService } from '@/services/api';
import type { UserMemory, OrgMemory, LearnedKind } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import FirmMemoryPage from './FirmMemoryPage';

const MAX_SIZE_NOTES = 500;
const MAX_FREEFORM = 4000;
const MAX_THESIS = 4000;
const MAX_ORG_NOTES = 1000;

type PrefTab = 'personal' | 'firm';

const EMPTY_ORG_FORM = {
  thesis: '',
  liked: '',
  excluded: '',
  likedDeals: '',
  excludedDeals: '',
  geo: '',
  sizeNotes: '',
  hardExclusions: '',
};

const toCsv = (items: string[]) => items.join(', ');
const fromCsv = (text: string) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export default function AnalystPreferencesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<PrefTab>('personal');
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [learnedBusy, setLearnedBusy] = useState(false);
  const [form, setForm] = useState({
    liked: '',
    disliked: '',
    dealTypes: '',
    sizeNotes: '',
    notes: '',
  });

  // Org Memory (A3) — firm thesis; editable only by org admins.
  const [orgMemory, setOrgMemory] = useState<OrgMemory | null>(null);
  const [orgCanEdit, setOrgCanEdit] = useState(false);
  const [orgSaving, setOrgSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [orgForm, setOrgForm] = useState({ ...EMPTY_ORG_FORM });

  const hydrateOrgForm = (mem: OrgMemory) =>
    setOrgForm({
      thesis: mem.explicit_thesis,
      liked: toCsv(mem.liked_sectors),
      excluded: toCsv(mem.excluded_sectors),
      likedDeals: toCsv(mem.liked_deal_types),
      excludedDeals: toCsv(mem.excluded_deal_types),
      geo: toCsv(mem.geo_focus),
      sizeNotes: mem.size_notes,
      hardExclusions: mem.hard_exclusion_notes,
    });

  useEffect(() => {
    let active = true;
    Promise.allSettled([memoryService.get(), orgMemoryService.get()])
      .then(([memRes, orgRes]) => {
        if (!active) return;
        if (memRes.status === 'fulfilled') {
          const mem = memRes.value;
          setMemory(mem);
          setForm({
            liked: toCsv(mem.liked_sectors),
            disliked: toCsv(mem.disliked_sectors),
            dealTypes: toCsv(mem.deal_type_preferences),
            sizeNotes: mem.size_floor_notes,
            notes: mem.freeform_notes,
          });
        } else {
          toast.error('Failed to load personal preferences.');
        }
        // Org memory 403s for users with no organization — that's expected, not an error.
        if (orgRes.status === 'fulfilled') {
          setOrgMemory(orgRes.value.orgMemory);
          setOrgCanEdit(orgRes.value.canEdit);
          hydrateOrgForm(orgRes.value.orgMemory);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOrgSave = async (e: FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    try {
      const res = await orgMemoryService.update({
        explicit_thesis: orgForm.thesis.trim(),
        liked_sectors: fromCsv(orgForm.liked),
        excluded_sectors: fromCsv(orgForm.excluded),
        liked_deal_types: fromCsv(orgForm.likedDeals),
        excluded_deal_types: fromCsv(orgForm.excludedDeals),
        geo_focus: fromCsv(orgForm.geo),
        size_notes: orgForm.sizeNotes.trim(),
        hard_exclusion_notes: orgForm.hardExclusions.trim(),
      });
      setOrgMemory(res.orgMemory);
      hydrateOrgForm(res.orgMemory);
      toast.success(res.message || 'Firm thesis saved.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to save firm thesis.');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await orgMemoryService.recalculate();
      const refreshed = await orgMemoryService.get();
      setOrgMemory(refreshed.orgMemory);
      toast.success(res.message || 'Firm signals recalculated.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to recalculate.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await memoryService.update({
        liked_sectors: fromCsv(form.liked),
        disliked_sectors: fromCsv(form.disliked),
        deal_type_preferences: fromCsv(form.dealTypes),
        size_floor_notes: form.sizeNotes.trim(),
        freeform_notes: form.notes.trim(),
      });
      setMemory(res.memory);
      toast.success(res.message || 'Preferences saved.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  // Remove one system-learned signal (fit correction / outcome) the user disagrees with.
  const handleDeleteLearned = async (kind: LearnedKind, index: number) => {
    setLearnedBusy(true);
    try {
      setMemory(await memoryService.deleteLearnedItem(kind, index));
      toast.success('Removed.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to remove item.');
    } finally {
      setLearnedBusy(false);
    }
  };

  const handleClearLearned = async (kind: LearnedKind) => {
    setLearnedBusy(true);
    try {
      setMemory(await memoryService.clearLearned(kind));
      toast.success('Cleared.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to clear.');
    } finally {
      setLearnedBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="org-tab-loading">
        <Spinner />
      </div>
    );
  }

  // `kind` marks the two lists the user can prune (fit corrections + outcomes); the frequent-*
  // behavioral lists have no per-item delete (they're derived from saved presets).
  const learned: { label: string; items: string[]; kind?: LearnedKind }[] = memory
    ? [
        { label: 'Frequently searched sectors', items: memory.frequent_sectors },
        { label: 'Frequently used deal types', items: memory.frequent_deal_types },
        { label: 'Frequently used insights', items: memory.frequent_custom_insights },
        {
          label: 'Fit corrections (calibration)',
          items: memory.fit_corrections,
          kind: 'fit_corrections' as LearnedKind,
        },
        {
          label: 'Real-world outcomes',
          items: memory.outcome_signals,
          kind: 'outcome_signals' as LearnedKind,
        },
      ].filter((s) => s.items.length > 0)
    : [];

  const orgSummary = orgMemory?.auto_signals?.summary_lines ?? [];
  // Firm Memory tab exists only for org owners/admins; everyone else sees just the personal view.
  const showFirmTab = orgCanEdit && !!orgMemory;
  const onFirmTab = showFirmTab && tab === 'firm';

  const personalView = (
    <>
      <div className="criteria-card criteria-card--white mb-3">
        <h3 className="api-keys-title mb-1">My Explicit Preferences</h3>
        <p className="text-muted small mb-3">
          Tell the AI exactly what you care about. These are injected into every scoring and
          rationale call, and the model will call out alignment or mismatches inline.
        </p>
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label" htmlFor="ap-liked">
              Preferred sectors <span className="text-muted">(comma-separated, max 20)</span>
            </label>
            <input
              id="ap-liked"
              className="form-control"
              placeholder="HVAC services, B2B SaaS, healthcare IT"
              value={form.liked}
              onChange={(e) => setForm((f) => ({ ...f, liked: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="ap-disliked">
              Sectors to avoid <span className="text-muted">(comma-separated, max 20)</span>
            </label>
            <input
              id="ap-disliked"
              className="form-control"
              placeholder="consumer retail, restaurants"
              value={form.disliked}
              onChange={(e) => setForm((f) => ({ ...f, disliked: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="ap-dealtypes">
              Deal-type preferences <span className="text-muted">(comma-separated)</span>
            </label>
            <input
              id="ap-dealtypes"
              className="form-control"
              placeholder="platform, add-on, carve-out"
              value={form.dealTypes}
              onChange={(e) => setForm((f) => ({ ...f, dealTypes: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="ap-size">
              Size guidance{' '}
              <span className="text-muted">
                ({form.sizeNotes.length}/{MAX_SIZE_NOTES})
              </span>
            </label>
            <input
              id="ap-size"
              className="form-control"
              maxLength={MAX_SIZE_NOTES}
              placeholder="e.g. Minimum $2M EBITDA; sweet spot $5–15M revenue"
              value={form.sizeNotes}
              onChange={(e) => setForm((f) => ({ ...f, sizeNotes: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="ap-notes">
              Analyst notes / personal thesis{' '}
              <span className="text-muted">
                ({form.notes.length}/{MAX_FREEFORM})
              </span>
            </label>
            <textarea
              id="ap-notes"
              className="form-control"
              rows={5}
              maxLength={MAX_FREEFORM}
              placeholder="Anything the AI should keep in mind when judging fit for you — e.g. prefer founder-owned businesses open to majority sale."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </form>
      </div>

      <div className="criteria-card criteria-card--white">
        <h3 className="api-keys-title mb-1">Learned from your usage</h3>
        <p className="text-muted small mb-3">
          Filled automatically from your activity (saved presets, fit overrides, deal outcomes). You
          can remove fit corrections and deal outcomes you disagree with — they stop influencing
          scoring right away.
        </p>
        {learned.length ? (
          learned.map((section) => (
            <div className="mb-3" key={section.label}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <div className="fw-semibold small">{section.label}</div>
                {section.kind && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-danger"
                    onClick={() => handleClearLearned(section.kind!)}
                    disabled={learnedBusy}
                  >
                    Clear all
                  </button>
                )}
              </div>
              <ul className="list-group list-group-flush">
                {section.items.map((item, i) => (
                  <li
                    key={`${section.label}-${i}`}
                    className="list-group-item px-0 py-1 small text-muted d-flex justify-content-between align-items-start gap-2"
                  >
                    <span>{item}</span>
                    {section.kind && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-danger flex-shrink-0"
                        aria-label={`Remove: ${item}`}
                        title="Remove"
                        onClick={() => handleDeleteLearned(section.kind!, i)}
                        disabled={learnedBusy}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-muted mb-0">
            Nothing learned yet — this fills in as you save presets, override fits, and tag
            outcomes.
          </p>
        )}
      </div>
    </>
  );

  const firmView = orgMemory && (
    <>
      <div className="criteria-card criteria-card--white mb-3">
        <h3 className="api-keys-title mb-1">Firm Investment Thesis</h3>
        <p className="text-muted small mb-3">
          Firm-wide scoring context applied to every analyst&apos;s runs, before individual
          preferences. You can edit this as an org admin.
        </p>

        <form onSubmit={handleOrgSave}>
          <div className="mb-3">
            <label className="form-label" htmlFor="org-thesis">
              Firm thesis{' '}
              <span className="text-muted">
                ({orgForm.thesis.length}/{MAX_THESIS})
              </span>
            </label>
            <textarea
              id="org-thesis"
              className="form-control"
              rows={4}
              maxLength={MAX_THESIS}
              placeholder="e.g. We acquire profitable lower-middle-market B2B services businesses in North America."
              value={orgForm.thesis}
              onChange={(e) => setOrgForm((f) => ({ ...f, thesis: e.target.value }))}
            />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="org-liked">
                Firm-preferred sectors
              </label>
              <input
                id="org-liked"
                className="form-control"
                placeholder="HVAC, IT services"
                value={orgForm.liked}
                onChange={(e) => setOrgForm((f) => ({ ...f, liked: e.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="org-excluded">
                Firm-excluded sectors
              </label>
              <input
                id="org-excluded"
                className="form-control"
                placeholder="cannabis, gambling"
                value={orgForm.excluded}
                onChange={(e) => setOrgForm((f) => ({ ...f, excluded: e.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="org-likedeals">
                Firm-preferred deal types
              </label>
              <input
                id="org-likedeals"
                className="form-control"
                placeholder="add-on, platform"
                value={orgForm.likedDeals}
                onChange={(e) => setOrgForm((f) => ({ ...f, likedDeals: e.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="org-excldeals">
                Firm-excluded deal types
              </label>
              <input
                id="org-excldeals"
                className="form-control"
                placeholder="turnaround"
                value={orgForm.excludedDeals}
                onChange={(e) => setOrgForm((f) => ({ ...f, excludedDeals: e.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="org-geo">
                Geographic focus
              </label>
              <input
                id="org-geo"
                className="form-control"
                placeholder="North America, UK"
                value={orgForm.geo}
                onChange={(e) => setOrgForm((f) => ({ ...f, geo: e.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="org-size">
                Firm size guidance
              </label>
              <input
                id="org-size"
                className="form-control"
                maxLength={MAX_ORG_NOTES}
                placeholder="$2-15M EBITDA"
                value={orgForm.sizeNotes}
                onChange={(e) => setOrgForm((f) => ({ ...f, sizeNotes: e.target.value }))}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="org-hard">
              Hard exclusions (never a fit)
            </label>
            <input
              id="org-hard"
              className="form-control"
              maxLength={MAX_ORG_NOTES}
              placeholder="pre-revenue startups, single-customer businesses"
              value={orgForm.hardExclusions}
              onChange={(e) => setOrgForm((f) => ({ ...f, hardExclusions: e.target.value }))}
            />
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <button type="submit" className="btn btn-standard rounded-pill" disabled={orgSaving}>
              {orgSaving ? 'Saving…' : 'Save firm thesis'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              {recalculating ? 'Recalculating…' : 'Recalculate firm signals'}
            </button>
          </div>
        </form>

        {orgSummary.length > 0 && (
          <div className="mt-3">
            <div className="fw-semibold small mb-1">Learned from the team&apos;s deals</div>
            <ul className="list-group list-group-flush">
              {orgSummary.map((line, i) => (
                <li key={`org-sig-${i}`} className="list-group-item px-0 py-1 small text-muted">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Per-firm notes (F4) — the same manager as the standalone /financial-verticals/firm-memory
          page, embedded here so firm-wide memory lives in one place. */}
      <FirmMemoryPage />
    </>
  );

  return (
    <>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4 pt-2">
        <div>
          <h1 className="page-title">{onFirmTab ? 'Firm Memory' : 'My Preferences'}</h1>
          <p className="page-subtitle">
            {onFirmTab
              ? "Your firm's shared thesis and what the whole team has learned from real deals — injected into every run for everyone."
              : 'Your preferences are injected automatically into every scoring and rationale run, and persist across sessions.'}
          </p>
        </div>
        {showFirmTab && (
          <div className="scope-tabs" role="tablist" aria-label="Preferences scope">
            <button
              type="button"
              role="tab"
              className={`scope-tabs__btn${tab === 'personal' ? ' is-active' : ''}`}
              aria-selected={tab === 'personal'}
              onClick={() => setTab('personal')}
            >
              My Preferences
            </button>
            <button
              type="button"
              role="tab"
              className={`scope-tabs__btn${tab === 'firm' ? ' is-active' : ''}`}
              aria-selected={tab === 'firm'}
              onClick={() => setTab('firm')}
            >
              Firm Memory
            </button>
          </div>
        )}
      </div>

      {onFirmTab ? firmView : personalView}
    </>
  );
}
