// Company detail slide-over (QURALYST-20 parity) — right drawer with Contacts / Activity / Comments.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from '@/components/ui';
import {
  dealsService,
  BUYER_TYPES,
  BUYER_TYPE_LABELS,
  CONTACT_OUTREACH_STATUSES,
  CONTACT_OUTREACH_LABELS,
  normalizeContactOutreach,
  type CompanyRecord,
  type DealActivity,
  type DealComment,
  type DealMember,
  type RecordContact,
  type ContactOutreachStatus,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';

type DetailTab = 'contacts' | 'activity' | 'comments';

const EVENT_LABELS: Record<string, string> = {
  'company.added': 'Added to pipeline',
  company_record_created: 'Added to pipeline',
  stage_changed: 'Stage changed',
  owner_changed: 'Owner changed',
  tier_changed: 'Tier changed',
  buyer_type_changed: 'Buyer type changed',
  contact_outreach_updated: 'Outreach status updated',
  note_added: 'Note',
  'comment.added': 'Comment posted',
  comment_added: 'Comment posted',
  'company.updated': 'Company updated',
  'company.deleted': 'Removed from pipeline',
};

function memberLabel(m: DealMember): string {
  return m.name || m.email || m.userId;
}

function contactKey(c: RecordContact, i: number): string {
  return c.contactId || `${c.email || c.name || 'contact'}-${i}`;
}

const OUTREACH_PILL_CLASS: Record<ContactOutreachStatus, string> = {
  not_contacted: 'deal-outreach-pill--not-contacted',
  contacted: 'deal-outreach-pill--contacted',
  responded: 'deal-outreach-pill--responded',
  meeting_set: 'deal-outreach-pill--meeting-set',
  passed: 'deal-outreach-pill--passed',
};

export default function CompanyDetailPanel({
  dealId,
  record,
  members,
  stageLabel,
  onClose,
  onUpdated,
}: {
  dealId: string;
  record: CompanyRecord;
  members: DealMember[];
  stageLabel: string;
  onClose: () => void;
  onUpdated: (rec: CompanyRecord) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<DetailTab>('contacts');
  const [comments, setComments] = useState<DealComment[]>([]);
  const [activity, setActivity] = useState<DealActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
  });
  const [outreach, setOutreach] = useState(record.outreachStatus);
  const [passReason, setPassReason] = useState(record.passReason);
  const [buyerType, setBuyerType] = useState(record.buyerType);
  const [tier, setTier] = useState<string>(record.tier ? String(record.tier) : '');
  const [ownerUserId, setOwnerUserId] = useState(record.ownerUserId || '');
  const [savingFields, setSavingFields] = useState(false);
  const [mentionMenuPos, setMentionMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const pickingMention = useRef(false);

  useEffect(() => {
    setOutreach(record.outreachStatus);
    setPassReason(record.passReason);
    setBuyerType(record.buyerType);
    setTier(record.tier ? String(record.tier) : '');
    setOwnerUserId(record.ownerUserId || '');
    setTab('contacts');
    setAddingContact(false);
    setText('');
    setMentions([]);
    setNoteText('');
  }, [
    record.id,
    record.outreachStatus,
    record.passReason,
    record.buyerType,
    record.tier,
    record.ownerUserId,
  ]);

  useEffect(() => {
    let active = true;
    dealsService
      .listComments(dealId, record.id)
      .then((c) => {
        if (active) setComments(c);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [dealId, record.id]);

  const loadActivity = async () => {
    setLoadingActivity(true);
    try {
      setActivity(await dealsService.listCompanyActivity(dealId, record.id));
    } catch {
      setActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (tab !== 'activity') return;
    void loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dealId, record.id]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Let the comment composer dismiss an open @mention first.
      if (mentionQuery !== null) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, mentionQuery]);

  const updateMentionPos = () => {
    const el = commentInputRef.current;
    if (!el) {
      setMentionMenuPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setMentionMenuPos({
      top: rect.top - 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  };

  useEffect(() => {
    if (mentionMatches.length === 0) {
      setMentionMenuPos(null);
      return;
    }
    updateMentionPos();
    const onReposition = () => updateMentionPos();
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
    setMentions((prev) => (prev.includes(m.userId) ? prev : [...prev, m.userId]));
    requestAnimationFrame(() => {
      commentInputRef.current?.focus();
      pickingMention.current = false;
    });
  };

  const saveFields = async () => {
    setSavingFields(true);
    try {
      const owner = members.find((m) => m.userId === ownerUserId);
      const updated = await dealsService.updateCompany(dealId, record.id, {
        outreachStatus: outreach,
        passReason,
        buyerType,
        tier: tier ? Number(tier) : null,
        ownerUserId,
        ownerName: owner ? memberLabel(owner) : '',
      });
      onUpdated(updated);
      toast.success('Saved.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not save.');
    } finally {
      setSavingFields(false);
    }
  };

  const addContact = async () => {
    if (!newContact.name.trim()) return;
    setSavingContact(true);
    try {
      const next: RecordContact[] = [
        ...(record.contacts || []),
        {
          name: newContact.name.trim(),
          title: newContact.title.trim(),
          email: newContact.email.trim(),
          phone: newContact.phone.trim(),
          isPrimary: (record.contacts || []).length === 0,
          outreachStatus: 'not_contacted',
        },
      ];
      const updated = await dealsService.updateCompany(dealId, record.id, { contacts: next });
      onUpdated(updated);
      setAddingContact(false);
      setNewContact({ name: '', title: '', email: '', phone: '' });
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not add contact.');
    } finally {
      setSavingContact(false);
    }
  };

  const updateContactOutreach = async (index: number, outreachStatus: ContactOutreachStatus) => {
    const prev = record.contacts || [];
    const next = prev.map((c, i) =>
      i === index ? { ...c, outreachStatus, contactId: c.contactId } : c,
    );
    // Optimistic UI
    onUpdated({ ...record, contacts: next });
    try {
      const updated = await dealsService.updateCompany(dealId, record.id, { contacts: next });
      onUpdated(updated);
    } catch (err) {
      onUpdated({ ...record, contacts: prev });
      toast.error((err as { message?: string })?.message ?? 'Could not update outreach.');
    }
  };

  const removeContact = async (index: number) => {
    try {
      const next = (record.contacts || []).filter((_, i) => i !== index);
      const updated = await dealsService.updateCompany(dealId, record.id, { contacts: next });
      onUpdated(updated);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not remove contact.');
    }
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      await dealsService.addCompanyNote(dealId, record.id, noteText.trim());
      setNoteText('');
      await loadActivity();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not save note.');
    } finally {
      setNoteSaving(false);
    }
  };

  const addComment = async () => {
    if (!text.trim() || pickingMention.current) return;
    const active = mentions.filter((uid) => {
      const m = members.find((x) => x.userId === uid);
      return m && text.includes(`@${memberLabel(m)}`);
    });
    try {
      const c = await dealsService.addComment(dealId, record.id, text.trim(), active);
      setComments((prev) => [...prev, c]);
      setText('');
      setMentions([]);
      setMentionMenuPos(null);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not add comment.');
    }
  };

  const websiteHref =
    record.website &&
    (record.website.startsWith('http') ? record.website : `https://${record.website}`);

  const mentionMenu =
    mentionMatches.length > 0 && mentionMenuPos
      ? createPortal(
          <ul
            className="deal-mention-menu"
            role="listbox"
            aria-label="Mention a member"
            style={{
              top: mentionMenuPos.top,
              left: mentionMenuPos.left,
              width: mentionMenuPos.width,
              transform: 'translateY(-100%)',
            }}
          >
            {mentionMatches.map((m) => (
              <li key={m.userId}>
                <button
                  type="button"
                  className="deal-mention-menu__btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickMention(m);
                  }}
                >
                  <span className="deal-mention-menu__avatar" aria-hidden="true">
                    {(m.name || m.email || m.userId).charAt(0).toUpperCase()}
                  </span>
                  <span className="deal-mention-menu__meta">
                    <span className="deal-mention-menu__name">{m.name || m.userId}</span>
                    {m.email ? <span className="deal-mention-menu__email">{m.email}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return createPortal(
    <>
      <button
        type="button"
        className="deal-detail-backdrop"
        aria-label="Close company details"
        onClick={onClose}
      />
      <aside
        className="deal-detail-drawer"
        role="region"
        aria-label={`Details for ${record.companyName}`}
      >
        <div className="deal-detail-drawer__header">
          <div className="deal-detail-drawer__title-row">
            <h2 className="deal-detail-drawer__title">{record.companyName}</h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Close details"
              onClick={onClose}
            />
          </div>
          {websiteHref ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noreferrer"
              className="deal-detail-drawer__web"
            >
              {record.website}
            </a>
          ) : null}
          <p className="deal-detail-drawer__meta small text-muted mb-0">
            Stage: {stageLabel || '—'}
            {record.ownerName ? ` · Owner: ${record.ownerName}` : ''}
          </p>
        </div>

        <div className="deal-detail-drawer__fields">
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small mb-1" htmlFor={`outreach-${record.id}`}>
                Outreach
              </label>
              <input
                id={`outreach-${record.id}`}
                className="form-control form-control-sm"
                placeholder="e.g. Emailed"
                value={outreach}
                onChange={(e) => setOutreach(e.target.value)}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-1" htmlFor={`tier-${record.id}`}>
                Tier
              </label>
              <select
                id={`tier-${record.id}`}
                className="form-select form-select-sm"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              >
                <option value="">—</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small mb-1" htmlFor={`buyer-${record.id}`}>
                Buyer type
              </label>
              <select
                id={`buyer-${record.id}`}
                className="form-select form-select-sm"
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value)}
              >
                <option value="">—</option>
                {BUYER_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {BUYER_TYPE_LABELS[v]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small mb-1" htmlFor={`owner-${record.id}`}>
                Owner
              </label>
              <select
                id={`owner-${record.id}`}
                className="form-select form-select-sm"
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {memberLabel(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label small mb-1" htmlFor={`pass-${record.id}`}>
                Pass reason
              </label>
              <input
                id={`pass-${record.id}`}
                className="form-control form-control-sm"
                placeholder="Optional"
                value={passReason}
                onChange={(e) => setPassReason(e.target.value)}
              />
            </div>
            <div className="col-12 text-end">
              <button
                type="button"
                className="deal-btn deal-btn--sm"
                onClick={saveFields}
                disabled={savingFields}
              >
                {savingFields ? <Spinner size="sm" /> : null} Save details
              </button>
            </div>
          </div>
        </div>

        <div className="deal-detail-tabs" role="tablist" aria-label="Company detail sections">
          {(
            [
              ['contacts', 'Contacts'],
              ['activity', 'Activity'],
              ['comments', `Comments${comments.length ? ` (${comments.length})` : ''}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`deal-detail-tabs__btn${tab === id ? ' is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="deal-detail-drawer__body">
          {tab === 'contacts' && (
            <div className="deal-detail-tab-pane">
              {(record.contacts || []).length === 0 && !addingContact ? (
                <p className="deal-detail-empty">No contacts yet.</p>
              ) : null}
              <ul className="deal-contact-list">
                {(record.contacts || []).map((c, i) => {
                  const status = normalizeContactOutreach(c.outreachStatus);
                  return (
                    <li key={contactKey(c, i)} className="deal-contact-card">
                      <div className="deal-contact-card__main">
                        <p className="deal-contact-card__name">{c.name || 'Untitled'}</p>
                        {c.title ? <p className="deal-contact-card__title">{c.title}</p> : null}
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="deal-contact-card__email">
                            {c.email}
                          </a>
                        ) : null}
                        {c.phone ? <p className="deal-contact-card__phone">{c.phone}</p> : null}
                      </div>
                      <div className="deal-contact-card__actions">
                        <select
                          className={`deal-outreach-pill ${OUTREACH_PILL_CLASS[status]}`}
                          value={status}
                          aria-label={`Outreach status for ${c.name || 'contact'}`}
                          onChange={(e) =>
                            void updateContactOutreach(i, e.target.value as ContactOutreachStatus)
                          }
                        >
                          {CONTACT_OUTREACH_STATUSES.map((v) => (
                            <option key={v} value={v}>
                              {CONTACT_OUTREACH_LABELS[v]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="deal-contact-card__delete"
                          aria-label={`Remove ${c.name || 'contact'}`}
                          onClick={() => void removeContact(i)}
                        >
                          <i className="bi bi-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {addingContact ? (
                <div className="deal-contact-form">
                  <p className="deal-contact-form__label">New contact</p>
                  <div className="row g-2">
                    <div className="col-6">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Name *"
                        value={newContact.name}
                        onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                        aria-label="Contact name"
                      />
                    </div>
                    <div className="col-6">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Title"
                        value={newContact.title}
                        onChange={(e) => setNewContact((p) => ({ ...p, title: e.target.value }))}
                        aria-label="Contact title"
                      />
                    </div>
                    <div className="col-6">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Email"
                        value={newContact.email}
                        onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                        aria-label="Contact email"
                      />
                    </div>
                    <div className="col-6">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                        aria-label="Contact phone"
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button
                      type="button"
                      className="deal-btn deal-btn--sm"
                      disabled={!newContact.name.trim() || savingContact}
                      onClick={() => void addContact()}
                    >
                      {savingContact ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      className="deal-btn deal-btn--sm deal-btn--ghost"
                      onClick={() => setAddingContact(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="deal-add-contact-btn"
                  onClick={() => setAddingContact(true)}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Add Contact
                </button>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="deal-detail-tab-pane">
              <div className="d-flex gap-2 mb-3">
                <input
                  className="form-control form-control-sm"
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void saveNote();
                    }
                  }}
                  aria-label="Add a note"
                />
                <button
                  type="button"
                  className="deal-btn deal-btn--sm"
                  disabled={!noteText.trim() || noteSaving}
                  onClick={() => void saveNote()}
                >
                  {noteSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              {loadingActivity ? (
                <div className="text-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : activity.length === 0 ? (
                <p className="deal-detail-empty">No activity yet</p>
              ) : (
                <ul className="deal-activity-list">
                  {activity.map((entry) => {
                    const payload = entry.payload || {};
                    const toStage =
                      typeof payload.to_stage_name === 'string'
                        ? payload.to_stage_name
                        : typeof payload.toStageName === 'string'
                          ? payload.toStageName
                          : null;
                    return (
                      <li key={entry.id} className="deal-activity-item">
                        <span className="deal-activity-item__dot" aria-hidden="true" />
                        <div>
                          <p className="deal-activity-item__text">
                            <strong>{entry.actorName || 'System'}</strong>{' '}
                            {EVENT_LABELS[entry.actionType] ?? entry.actionType}
                            {toStage ? (
                              <>
                                {' '}
                                → <strong>{toStage}</strong>
                              </>
                            ) : null}
                            {entry.actionType === 'note_added' &&
                            typeof payload.note === 'string' ? (
                              <>
                                : <em>&ldquo;{payload.note}&rdquo;</em>
                              </>
                            ) : null}
                          </p>
                          {entry.createdAt ? (
                            <p className="deal-activity-item__time">
                              {new Date(entry.createdAt).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div className="deal-detail-tab-pane deal-detail-tab-pane--comments">
              <div className="deal-comments-scroll">
                {comments.length === 0 ? (
                  <p className="deal-detail-empty">No comments yet. Start the conversation.</p>
                ) : (
                  <ul className="deal-comments-list">
                    {comments.map((c) => (
                      <li key={c.id} className="deal-comment-item">
                        <div className="deal-comment-item__head">
                          <span className="deal-comment-item__author">
                            {c.authorName || c.authorUserId}
                          </span>
                          {c.createdAt ? (
                            <span className="deal-comment-item__time">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                        <p className="deal-comment-item__body">{c.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="deal-comment-composer">
                {mentionMenu}
                <div className="d-flex gap-2">
                  <input
                    ref={commentInputRef}
                    className="form-control form-control-sm"
                    placeholder="Comment… type @name to mention"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    aria-label="Add a comment"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && mentionQuery !== null) {
                        e.preventDefault();
                        setText((t) =>
                          t.replace(/(?:^|\s)@([^\s@]*)$/, (match) =>
                            match.replace(/@([^\s@]*)$/, ''),
                          ),
                        );
                        return;
                      }
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        text.trim() &&
                        mentionQuery === null
                      ) {
                        e.preventDefault();
                        void addComment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="deal-btn deal-btn--sm"
                    onClick={() => void addComment()}
                    disabled={!text.trim()}
                    aria-label="Post comment"
                  >
                    <i className="bi bi-send" aria-hidden="true" />
                  </button>
                </div>
                <p className="deal-comment-composer__hint">
                  Enter to send · Esc to dismiss @mention
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
