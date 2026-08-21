// Deal Buyer Log — sell-side milestone grid + Excel exports (QURALYST-20 parity).
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from '@/components/ui';
import {
  dealsService,
  BUYER_TYPES,
  BUYER_TYPE_LABELS,
  type Deal,
  type DealMember,
  type BuyerLogRow,
  type RecordContact,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';
import '@/styles/pages/deals.css';

const PASS_REASON_PRESETS = [
  'General pass.',
  'Went dark.',
  'Too small.',
  'Outside of investment scope and criteria.',
  'Growth bump too recent.',
  'Too much customer concentration.',
  'Too far apart on valuation.',
  'Refused to sign NDA.',
  'Disliked an aspect of the business.',
] as const;

const PASS_REASON_CUSTOM = '__custom__';
const PASS_REASON_NONE = '__none__';

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function primaryContact(row: BuyerLogRow): RecordContact | null {
  if (row.primaryContact) return row.primaryContact;
  const contacts = row.contacts ?? [];
  return contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null;
}

function memberLabel(m: DealMember): string {
  return m.name || m.email || m.userId;
}

function TierSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <select
      className="deal-buyer-inline-select"
      value={value ? String(value) : ''}
      aria-label="Tier"
      onChange={(e) => {
        const v = e.target.value;
        onChange(v ? Number(v) : null);
      }}
    >
      <option value="">No tier</option>
      <option value="1">Tier 1</option>
      <option value="2">Tier 2</option>
      <option value="3">Tier 3</option>
    </select>
  );
}

function BuyerTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="deal-buyer-inline-select"
      value={value || ''}
      aria-label="Buyer type"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Not set</option>
      {BUYER_TYPES.map((v) => (
        <option key={v} value={v}>
          {BUYER_TYPE_LABELS[v]}
        </option>
      ))}
      {value && !BUYER_TYPES.includes(value as (typeof BUYER_TYPES)[number]) && (
        <option value={value}>{value} (legacy)</option>
      )}
    </select>
  );
}

function NotesCell({
  value,
  members,
  onSave,
}: {
  value: string;
  members: DealMember[];
  onSave: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Keep blur from saving while the user is clicking a mention option.
  const pickingMention = useRef(false);

  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);

  const mentionQuery = useMemo(() => {
    const m = text.match(/(?:^|\s)@([^\s@]*)$/);
    return m ? m[1].toLowerCase() : null;
  }, [text]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .filter((m) => `${m.name} ${m.email} ${m.userId}`.toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [mentionQuery, members]);

  const updateMenuPos = () => {
    const el = textareaRef.current;
    if (!el) {
      setMenuPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 180),
    });
  };

  useEffect(() => {
    if (mentionMatches.length === 0) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
    const onReposition = () => updateMenuPos();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [mentionMatches.length, text]);

  const pickMention = (m: DealMember) => {
    pickingMention.current = true;
    setText((t) =>
      t.replace(/(?:^|\s)@([^\s@]*)$/, (match) => {
        const lead = match.startsWith('@') ? '' : match[0];
        return `${lead}@${memberLabel(m)} `;
      }),
    );
    // Clear the guard SYNCHRONOUSLY — the pick is done once the text is queued. The menu button
    // preventDefaults its mousedown, so picking never blurs the textarea; the only thing the guard
    // must cover is this synchronous handler. Clearing it in a rAF instead left a window where a
    // blur fired right after picking (e.g. Tab, or a slow CI frame) hit `commit` while the flag was
    // still set and silently dropped the save. The rAF now only restores focus for further typing.
    pickingMention.current = false;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const commit = () => {
    if (pickingMention.current) return;
    setFocused(false);
    setMenuPos(null);
    const next = text.trim();
    if (next !== value.trim()) onSave(next);
  };

  const menu =
    mentionMatches.length > 0 && menuPos
      ? createPortal(
          <ul
            className="deal-buyer-mention-menu"
            role="listbox"
            aria-label="Mention a member"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            {mentionMatches.map((m) => (
              <li key={m.userId}>
                <button
                  type="button"
                  className="deal-buyer-mention-menu__btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickMention(m);
                  }}
                >
                  <span className="deal-buyer-mention-menu__name">{m.name || m.userId}</span>
                  {m.email ? (
                    <span className="deal-buyer-mention-menu__email">{m.email}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="deal-buyer-notes-wrap" ref={wrapRef}>
      {menu}
      <textarea
        ref={textareaRef}
        className="deal-buyer-notes"
        value={text}
        rows={2}
        placeholder="Add a comment — type @ to mention"
        aria-label="Comments"
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && mentionQuery !== null) {
            e.preventDefault();
            setText((t) =>
              t.replace(/(?:^|\s)@([^\s@]*)$/, (match) => match.replace(/@([^\s@]*)$/, '')),
            );
          }
        }}
      />
    </div>
  );
}

function PassReasonCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const trimmed = value.trim();
  const isPreset = (PASS_REASON_PRESETS as readonly string[]).includes(trimmed);
  const [selectValue, setSelectValue] = useState(
    !trimmed ? PASS_REASON_NONE : isPreset ? trimmed : PASS_REASON_CUSTOM,
  );
  const [text, setText] = useState(trimmed);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    const next = value.trim();
    setText(next);
    setSelectValue(
      !next
        ? PASS_REASON_NONE
        : (PASS_REASON_PRESETS as readonly string[]).includes(next)
          ? next
          : PASS_REASON_CUSTOM,
    );
  }, [value, focused]);

  const passed = !!trimmed;

  const commitText = (next: string) => {
    const cleaned = next.trim();
    if (cleaned !== value.trim()) onSave(cleaned);
  };

  return (
    <div className="deal-buyer-pass">
      {passed ? <span className="deal-buyer-pass__badge">Passed</span> : null}
      <select
        className="deal-buyer-pass__select"
        value={selectValue}
        aria-label="Pass reason preset"
        onChange={(e) => {
          const v = e.target.value;
          setSelectValue(v);
          if (v === PASS_REASON_NONE) {
            setText('');
            commitText('');
            return;
          }
          if (v === PASS_REASON_CUSTOM) {
            setFocused(true);
            return;
          }
          setText(v);
          commitText(v);
        }}
      >
        <option value={PASS_REASON_NONE}>No pass reason</option>
        {PASS_REASON_PRESETS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value={PASS_REASON_CUSTOM}>Other (custom)…</option>
      </select>
      {(selectValue === PASS_REASON_CUSTOM || (!isPreset && !!trimmed)) && (
        <input
          className="deal-buyer-pass__input"
          value={text}
          placeholder="Describe the pass reason…"
          aria-label="Pass reason"
          onChange={(e) => {
            setText(e.target.value);
            setSelectValue(PASS_REASON_CUSTOM);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitText(text);
          }}
        />
      )}
    </div>
  );
}

type RowPatch = {
  notes?: string;
  passReason?: string;
  tier?: number | null;
  buyerType?: string;
};

type SortKey = 'tier' | 'company_name' | '-company_name';

export default function BuyerLogTab({ deal }: { deal: Deal }) {
  const toast = useToast();
  const [rows, setRows] = useState<BuyerLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('__all__');
  const [typeFilter, setTypeFilter] = useState('__all__');
  const [stageFilter, setStageFilter] = useState('__all__');
  const [ownerFilter, setOwnerFilter] = useState('__all__');
  const [sortOrder, setSortOrder] = useState<SortKey>('tier');

  const stages = useMemo(() => [...deal.stages].sort((a, b) => a.order - b.order), [deal.stages]);
  const stageOrder = useMemo(() => new Map(stages.map((s) => [s.stageId, s.order])), [stages]);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await dealsService.buyerLog(deal.id));
    } catch {
      toast.error('Failed to load buyer log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  const patchRow = async (row: BuyerLogRow, input: RowPatch) => {
    if (!row.id) return;
    const prev = { ...row };
    setRows((rs) =>
      rs.map((r) =>
        r.id === row.id
          ? {
              ...r,
              ...input,
              tier: input.tier !== undefined ? input.tier : r.tier,
              buyerType: input.buyerType !== undefined ? input.buyerType : r.buyerType,
            }
          : r,
      ),
    );
    try {
      await dealsService.updateCompany(deal.id, row.id, input);
    } catch (err) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? prev : r)));
      toast.error((err as { message?: string })?.message ?? 'Could not save.');
    }
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (tierFilter !== '__all__') {
      const t = Number(tierFilter);
      list = list.filter((r) => r.tier === t);
    }
    if (typeFilter !== '__all__') {
      list = list.filter((r) => (r.buyerType || '') === typeFilter);
    }
    if (stageFilter !== '__all__') {
      list = list.filter((r) => (r.stageId || '') === stageFilter || r.stage === stageFilter);
    }
    if (ownerFilter !== '__all__') {
      list = list.filter((r) => (r.ownerUserId || '') === ownerFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const pc = primaryContact(r);
        return (
          r.companyName.toLowerCase().includes(q) ||
          (r.buyerType || '').toLowerCase().includes(q) ||
          (r.stage || '').toLowerCase().includes(q) ||
          (r.passReason || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q) ||
          (r.ownerName || '').toLowerCase().includes(q) ||
          (pc?.name || '').toLowerCase().includes(q) ||
          (pc?.email || '').toLowerCase().includes(q)
        );
      });
    }
    list.sort((a, b) => {
      if (sortOrder === 'company_name') return a.companyName.localeCompare(b.companyName);
      if (sortOrder === '-company_name') return b.companyName.localeCompare(a.companyName);
      const ta = a.tier ?? 99;
      const tb = b.tier ?? 99;
      if (ta !== tb) return ta - tb;
      const sa = stageOrder.get(a.stageId || '') ?? 999;
      const sb = stageOrder.get(b.stageId || '') ?? 999;
      if (sa !== sb) return sa - sb;
      return a.companyName.localeCompare(b.companyName);
    });
    return list;
  }, [rows, search, ownerFilter, tierFilter, typeFilter, stageFilter, sortOrder, stageOrder]);

  if (loading) {
    return (
      <div className="org-tab-loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="deal-panel">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <p className="deal-panel__label mb-0">Buyer Log</p>
          <p className="deal-panel__hint mb-0">
            Milestone timeline for sell-side outreach across pipeline stages
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <a
            className="deal-btn deal-btn--outline deal-btn--sm"
            href={dealsService.statusReportUrl(deal.id)}
          >
            <i className="bi bi-download" aria-hidden="true" /> Status report
          </a>
          <a
            className="deal-btn deal-btn--outline deal-btn--sm"
            href={dealsService.marketingReportUrl(deal.id)}
          >
            <i className="bi bi-download" aria-hidden="true" /> Marketing report
          </a>
        </div>
      </div>

      <div className="deal-pipeline-filters">
        <input
          className="form-control form-control-sm"
          placeholder="Search buyers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search buyer log"
        />
        <select
          className="form-select form-select-sm"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          aria-label="Filter by tier"
        >
          <option value="__all__">All tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>
        <select
          className="form-select form-select-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by buyer type"
        >
          <option value="__all__">All buyer types</option>
          {BUYER_TYPES.map((v) => (
            <option key={v} value={v}>
              {BUYER_TYPE_LABELS[v]}
            </option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          aria-label="Filter by stage"
        >
          <option value="__all__">All stages</option>
          {stages.map((s) => (
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
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortKey)}
          aria-label="Sort buyer log"
        >
          <option value="tier">Tier (high to low)</option>
          <option value="company_name">Name A to Z</option>
          <option value="-company_name">Name Z to A</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted mb-0">No buyers logged yet. Add companies in the Pipeline view.</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted mb-0">No buyers match this search.</p>
      ) : (
        <div className="deal-table-wrap deal-table-wrap--scroll deal-table-wrap--buyer-log">
          <table className="deal-table deal-table--buyer-log">
            <thead>
              <tr>
                <th className="deal-buyer-col--buyer">Buyer</th>
                <th className="deal-buyer-col--tier">Tier</th>
                <th className="deal-buyer-col--type">Buyer Type</th>
                <th className="deal-buyer-col--owner">Owner</th>
                <th className="deal-buyer-col--contact">Contact</th>
                <th className="deal-buyer-col--comments">Comments</th>
                <th className="deal-buyer-col--pass">Pass Reason</th>
                {stages.map((s) => (
                  <th
                    key={s.stageId}
                    className="deal-buyer-col--stage"
                    style={s.color ? { color: s.color } : undefined}
                  >
                    <span className="deal-table__stage-head">
                      <span
                        className="deal-stage-dot"
                        style={s.color ? { backgroundColor: s.color } : undefined}
                      />
                      {s.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pc = primaryContact(r);
                return (
                  <tr key={r.id || r.companyName}>
                    <td className="deal-buyer-col--buyer">
                      <p className="deal-company-name">{r.companyName}</p>
                      {r.website ? <p className="deal-company-web">{r.website}</p> : null}
                    </td>
                    <td className="deal-buyer-col--tier">
                      <TierSelect value={r.tier} onChange={(tier) => void patchRow(r, { tier })} />
                    </td>
                    <td className="deal-buyer-col--type">
                      <BuyerTypeSelect
                        value={r.buyerType || ''}
                        onChange={(buyerType) => void patchRow(r, { buyerType })}
                      />
                    </td>
                    <td className="deal-buyer-col--owner">
                      <span className="small text-muted">{r.ownerName || 'Unassigned'}</span>
                    </td>
                    <td className="deal-buyer-col--contact">
                      {pc ? (
                        <div className="deal-buyer-contact">
                          <span className="deal-buyer-contact__name">{pc.name || '—'}</span>
                          {pc.title ? (
                            <span className="deal-buyer-contact__meta">{pc.title}</span>
                          ) : null}
                          {pc.email ? (
                            <span className="deal-buyer-contact__meta">{pc.email}</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="small text-muted">No contact</span>
                      )}
                    </td>
                    <td className="deal-buyer-col--comments">
                      <NotesCell
                        value={r.notes || ''}
                        members={deal.members}
                        onSave={(notes) => void patchRow(r, { notes })}
                      />
                    </td>
                    <td className="deal-buyer-col--pass">
                      <PassReasonCell
                        value={r.passReason || ''}
                        onSave={(passReason) => void patchRow(r, { passReason })}
                      />
                    </td>
                    {stages.map((s) => {
                      const date = fmtDate(r.stageDates?.[s.stageId]);
                      const isCurrent = s.stageId === r.stageId || s.name === r.stage;
                      return (
                        <td
                          key={s.stageId}
                          className="deal-buyer-col--stage"
                          style={
                            isCurrent && s.color
                              ? { backgroundColor: `${s.color}18`, color: s.color }
                              : undefined
                          }
                        >
                          <span
                            className={`deal-buyer-stage-date${isCurrent && date ? ' is-current' : ''}`}
                          >
                            {date || '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
