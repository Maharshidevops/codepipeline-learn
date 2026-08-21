// PE People — Team Directory card grid (F25.3). Server-driven offset pagination (limit 100),
// debounced search, Firm/Role/Focus PillSelect filters, provenance badges (Apollo|Inferred|
// Confirmed), flag/unflag + staff delete modals. Used standalone on /pe/people and, with a
// `firmId`, as the firm-detail People tab (hides the firm filter). Data: peService (TanStack Query).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button, Modal, Select } from '@/components/ui';
import type { ApiError, PEEmailVerificationStatus, PEPersonEmailLabel, PEPersonRow } from '@/types';
import '@/styles/pages/pe-people.css';

const PAGE_SIZE = 100;

// F66 §2.2 — these two lists were built against the WRONG upstream vocabularies, so both
// filters returned zero rows and every role badge fell through to "Other":
//   • roles were `investment|operations|advisor|other`, while the backend now stores
//     `investment|operations|finance|support|advisory` (`utils/pe_people_link.ROLE_TAGS`);
//   • focus areas were the reference `peopleTagger` list, which its own dataset shows was
//     dead code — `Industrials` / `Media & Communications` / `Industry Agnostic` are values
//     no correct backend ever emits. The live vocabulary is the 19 `STANDARD_SECTORS` labels,
//     the same set `PEHolding.sector` uses.
// Keep both in step with the backend; a value that only exists here filters to nothing.
const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'investment', label: 'Investment' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'support', label: 'Support' },
  { value: 'advisory', label: 'Advisory' },
];

const FOCUS_AREAS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer',
  'Business Services',
  'Industrial',
  'Energy',
  'Real Estate',
  'Media & Telecom',
  'Education',
  'Food & Beverage',
  'Government & Defense',
  'Life Sciences',
  'Transportation & Logistics',
  'Retail',
  'Hospitality & Travel',
  'Agriculture',
  'Infrastructure',
  'Diversified',
];

const FOCUS_OPTIONS = [
  { value: '', label: 'All focus areas' },
  ...FOCUS_AREAS.map((f) => ({ value: f, label: f })),
];

const ROLE_LABEL: Record<string, string> = {
  investment: 'Investment',
  operations: 'Operations',
  finance: 'Finance',
  support: 'Support',
  advisory: 'Advisory',
  // Legacy value still present in un-retagged rows, plus the display-only fallback bucket
  // `roleKey` resolves to for anything unrecognized. Neither is offered as a filter.
  advisor: 'Advisory',
  other: 'Other',
};

const FLAG_REASONS = ['Left the firm', 'Wrong phone number', 'Bad email address', 'Other'];

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
}

// Three style slots exist in pe-people.css (investment / operations / advisor) plus a neutral
// `other`. The F66 vocabulary has five categories, so `advisory` reuses the `advisor` slot —
// same concept, canonical spelling — and `finance` / `support` take the neutral slot rather
// than inventing theme tokens for them. The label text still comes from ROLE_LABEL, so the
// badge reads correctly either way.
const ROLE_BADGE_SLOT: Record<string, string> = {
  investment: 'investment',
  operations: 'operations',
  advisory: 'advisor',
  advisor: 'advisor',
};

function roleBadgeClass(role: string): string {
  return `pep-badge pep-badge--${ROLE_BADGE_SLOT[role] ?? 'other'}`;
}

function emailLabelClass(label: PEPersonEmailLabel): string {
  if (label === 'Apollo') return 'pep-badge pep-badge--apollo';
  if (label === 'Inferred') return 'pep-badge pep-badge--inferred';
  return 'pep-badge pep-badge--confirmed';
}

function verificationClass(status: PEEmailVerificationStatus): string {
  if (status === 'deliverable') return 'pep-badge pep-badge--verify-ok';
  if (status === 'risky') return 'pep-badge pep-badge--verify-risk';
  if (status === 'undeliverable') return 'pep-badge pep-badge--verify-bad';
  return 'pep-badge pep-badge--verify-unknown';
}

interface PillOption {
  value: string;
  label: string;
}

interface PillSelectProps {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  'aria-label'?: string;
}

function PillSelect({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: PillSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`pep-pill${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        role="combobox"
        className="pep-pill__trigger"
        aria-label={ariaLabel ?? selected?.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pep-pill__value">{selected?.label}</span>
        <i className="bi bi-chevron-down pep-pill__chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={listId}
          className="pep-pill__menu"
          role="listbox"
          aria-label={ariaLabel ?? 'Options'}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value || '__all'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`pep-pill__option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <i className="bi bi-check2" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Skel({ w, h = 14 }: { w: number; h?: number }) {
  return <span className="pep-skel" style={{ width: w, height: h }} />;
}

interface FlagModalProps {
  person: PEPersonRow | null;
  onClose: () => void;
  onInvalidate: () => void;
}

function FlagModal({ person, onClose, onInvalidate }: FlagModalProps) {
  const toast = useToast();
  const [reason, setReason] = useState(FLAG_REASONS[0]);

  useEffect(() => {
    if (person) setReason(FLAG_REASONS[0]);
  }, [person]);

  const flag = useMutation({
    mutationFn: () => peService.flagPerson(person!.id, reason),
    onSuccess: () => {
      toast.success('Contact flagged.');
      onInvalidate();
      onClose();
    },
    onError: () => toast.error('Could not flag the contact.'),
  });

  if (!person) return null;
  return (
    <Modal open onClose={onClose} title={`Flag ${person.name}`} size="sm">
      <div className="mb-3">
        <span className="form-label d-block" id="flag-reason-label">
          Why is this contact stale?
        </span>
        <Select
          value={reason}
          onChange={setReason}
          options={FLAG_REASONS.map((r) => ({ value: r, label: r }))}
          aria-labelledby="flag-reason-label"
        />
      </div>
      <div className="d-flex gap-2 justify-content-end">
        <Button variant="popup-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => flag.mutate()} disabled={flag.isPending}>
          {flag.isPending ? 'Flagging…' : 'Flag contact'}
        </Button>
      </div>
    </Modal>
  );
}

interface DeleteModalProps {
  person: PEPersonRow | null;
  onClose: () => void;
  onInvalidate: () => void;
}

function DeleteModal({ person, onClose, onInvalidate }: DeleteModalProps) {
  const toast = useToast();
  const del = useMutation({
    mutationFn: () => peService.deletePerson(person!.id),
    onSuccess: () => {
      toast.success('Person deleted.');
      onInvalidate();
      onClose();
    },
    onError: () => toast.error('Delete failed.'),
  });

  if (!person) return null;
  return (
    <Modal open onClose={onClose} title={`Delete ${person.name}?`} size="sm">
      <p>This soft-deletes the person from the dataset. This cannot be undone from the UI.</p>
      <div className="d-flex gap-2 justify-content-end">
        <Button variant="popup-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => del.mutate()} disabled={del.isPending}>
          {del.isPending ? 'Deleting…' : 'Confirm delete'}
        </Button>
      </div>
    </Modal>
  );
}

interface PersonCardProps {
  person: PEPersonRow;
  showFirm: boolean;
  isStaff: boolean;
  onFocusClick: (tag: string) => void;
  onFlag: (p: PEPersonRow) => void;
  onUnflag: (id: string) => void;
  unflagPending: boolean;
  onDelete: (p: PEPersonRow) => void;
}

function PersonCard({
  person,
  showFirm,
  isStaff,
  onFocusClick,
  onFlag,
  onUnflag,
  unflagPending,
  onDelete,
}: PersonCardProps) {
  const [expanded, setExpanded] = useState(false);
  const bioTruncated = !!person.bio && person.bio.length > 200;
  const flagged = !!person.flaggedAt;
  const roleKey = person.roleTag && ROLE_LABEL[person.roleTag] ? person.roleTag : 'other';

  const mailClass = person.emailInferred
    ? 'pep-contact--inferred'
    : person.emailSource === 'apollo'
      ? 'pep-contact--apollo'
      : 'pep-contact--confirmed';

  return (
    <article className={`pep-card${flagged ? ' pep-card--flagged' : ''}`}>
      <div className="pep-card__top">
        <div className="pep-avatar" aria-hidden="true">
          {person.photoUrl ? <img src={person.photoUrl} alt="" /> : initials(person.name)}
        </div>
        <div className="pep-card__identity">
          <div className="pep-card__name-row">
            <div className="pep-card__name-block">
              <p className="pep-card__name">
                {person.name}
                {flagged && (
                  <i
                    className="bi bi-flag-fill pep-card__flag-icon"
                    title={person.flagReason ?? 'Flagged'}
                    aria-hidden="true"
                  />
                )}
              </p>
              {person.title && <p className="pep-card__title">{person.title}</p>}
            </div>
            <div className="pep-card__contacts">
              {person.linkedinUrl && (
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${person.name} on LinkedIn`}
                  title="LinkedIn"
                >
                  <i className="bi bi-linkedin" aria-hidden="true" />
                </a>
              )}
              {person.email &&
                (person.emailInferred ? (
                  <span className={mailClass} title={`Inferred: ${person.email}`}>
                    <i className="bi bi-envelope-exclamation" aria-hidden="true" />
                  </span>
                ) : (
                  <a
                    href={`mailto:${person.email}`}
                    className={mailClass}
                    title={`${person.emailLabel ?? 'Email'}: ${person.email}`}
                    aria-label={`Email ${person.name}`}
                  >
                    <i className="bi bi-envelope-check" aria-hidden="true" />
                  </a>
                ))}
              {person.phone && (
                <a
                  href={`tel:${person.phone}`}
                  title={person.phone}
                  aria-label={`Call ${person.name}`}
                >
                  <i className="bi bi-telephone" aria-hidden="true" />
                </a>
              )}
              {person.pageUrl && (
                <a
                  href={person.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View bio page"
                  aria-label={`${person.name} bio page`}
                >
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
              )}
              {isStaff &&
                (flagged ? (
                  <button
                    type="button"
                    className="pep-btn pep-btn--icon is-flagged"
                    onClick={() => onUnflag(person.id)}
                    disabled={unflagPending}
                    title={`Flagged: ${person.flagReason ?? ''}`}
                    aria-label={`Remove flag from ${person.name}`}
                  >
                    <i className="bi bi-flag-fill" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pep-btn pep-btn--icon"
                    onClick={() => onFlag(person)}
                    title="Flag this contact"
                    aria-label={`Flag ${person.name}`}
                  >
                    <i className="bi bi-flag" aria-hidden="true" />
                  </button>
                ))}
              {isStaff && (
                <button
                  type="button"
                  className="pep-btn pep-btn--icon"
                  onClick={() => onDelete(person)}
                  title="Delete"
                  aria-label={`Delete ${person.name}`}
                >
                  <i className="bi bi-trash" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {showFirm && (
            <div className="pep-card__firm">
              <i className="bi bi-building" aria-hidden="true" />
              <span>{person.firmName}</span>
            </div>
          )}
        </div>
      </div>

      {person.bio && (
        <div>
          <p className="pep-card__bio">
            {expanded || !bioTruncated ? person.bio : `${person.bio.slice(0, 200)}…`}
          </p>
          {bioTruncated && (
            <button
              type="button"
              className="pep-card__bio-toggle"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {(person.location || person.strategy) && (
        <div className="pep-card__meta">
          {person.strategy && (
            <div>
              <strong>Strategy: </strong>
              {person.strategy}
            </div>
          )}
          {person.location && (
            <div>
              <strong>Office: </strong>
              {person.location}
            </div>
          )}
        </div>
      )}

      {person.portfolioCompanies.length > 0 && (
        <div className="pep-card__meta">
          <div>
            <strong>Portfolio: </strong>
            {person.portfolioCompanies.join(', ')}
          </div>
        </div>
      )}

      <div className="pep-card__tags">
        {person.roleTag && (
          <span className={roleBadgeClass(roleKey)}>{ROLE_LABEL[roleKey] ?? person.roleTag}</span>
        )}
        {person.focusTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="pep-badge pep-badge--focus"
            onClick={() => onFocusClick(tag)}
          >
            {tag}
          </button>
        ))}
        {person.email && person.emailLabel && (
          <span className={emailLabelClass(person.emailLabel)} title={person.email}>
            {person.emailLabel}
          </span>
        )}
        {person.emailVerificationStatus && (
          <span
            className={verificationClass(person.emailVerificationStatus)}
            title={
              typeof person.emailVerificationScore === 'number'
                ? `Kickbox: ${person.emailVerificationStatus} (sendex ${person.emailVerificationScore.toFixed(2)})`
                : `Kickbox: ${person.emailVerificationStatus}`
            }
          >
            {person.emailVerificationStatus}
            {typeof person.emailVerificationScore === 'number'
              ? ` ${person.emailVerificationScore.toFixed(2)}`
              : ''}
          </span>
        )}
        {person.linkedinUrl && (
          <span className="pep-badge pep-badge--linkedin">
            <i className="bi bi-linkedin" aria-hidden="true" />
            LinkedIn
          </span>
        )}
        {person.bio && <span className="pep-badge pep-badge--bio">bio</span>}
      </div>

      {(person.lastSeenAt || flagged) && (
        <div className="pep-card__footer">
          <span>
            {person.lastSeenAt
              ? `Last seen ${new Date(person.lastSeenAt).toLocaleDateString()}`
              : ''}
          </span>
          {flagged && (
            <span title={person.flagReason ?? undefined}>
              <i className="bi bi-flag-fill me-1" aria-hidden="true" />
              {person.flagReason}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export interface PeopleTableProps {
  /** When set, scopes the table to one firm and hides the firm filter. */
  firmId?: string;
  /** Controlled role filter (summary role pills on the page). */
  roleTag?: string;
  onRoleTagChange?: (value: string) => void;
  /** Hide in-grid search when the page toolbar owns it. */
  hideSearch?: boolean;
  searchInput?: string;
  onSearchInputChange?: (value: string) => void;
}

export default function PeopleTable({
  firmId,
  roleTag: roleTagProp,
  onRoleTagChange,
  hideSearch = false,
  searchInput: searchInputProp,
  onSearchInputChange,
}: PeopleTableProps) {
  const { currentUser } = useAuth();
  const isStaff = !!currentUser?.isAdmin;
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchInputLocal, setSearchInputLocal] = useState('');
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [roleTagLocal, setRoleTagLocal] = useState('');
  const [focusTag, setFocusTag] = useState('');
  const [page, setPage] = useState(0);
  const [flagTarget, setFlagTarget] = useState<PEPersonRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PEPersonRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchInput = searchInputProp ?? searchInputLocal;
  const setSearchInput = onSearchInputChange ?? setSearchInputLocal;
  const roleTag = roleTagProp ?? roleTagLocal;
  const setRoleTag = onRoleTagChange ?? setRoleTagLocal;

  const showFirmFilter = !firmId;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, firmFilter, roleTag, focusTag]);

  const summaryQuery = useQuery({
    queryKey: ['pe', 'people', 'summary'],
    queryFn: () => peService.getPeopleSummary(),
    enabled: showFirmFilter,
  });

  const firmsQuery = useQuery({
    queryKey: ['pe', 'firms', 'options'],
    queryFn: () => peService.listFirmOptions(),
    enabled: showFirmFilter && !summaryQuery.data,
  });

  const firmOptions = useMemo<PillOption[]>(() => {
    const fromSummary = summaryQuery.data?.firms ?? [];
    if (fromSummary.length > 0) {
      return [
        { value: '', label: 'All firms' },
        ...fromSummary.map((f) => ({
          value: f.firmId,
          label: `${f.firmName} (${f.count})`,
        })),
      ];
    }
    return [
      { value: '', label: 'All firms' },
      ...(firmsQuery.data ?? []).map((f) => ({ value: f.id, label: f.name })),
    ];
  }, [summaryQuery.data, firmsQuery.data]);

  const effectiveFirmId = firmId ?? (firmFilter || undefined);

  const { data, isPending, isFetching } = useQuery({
    queryKey: ['pe', 'people', { firmId: effectiveFirmId, search, roleTag, focusTag, page }],
    queryFn: () =>
      peService.listPeople({
        firmId: effectiveFirmId,
        search: search || undefined,
        roleTag: roleTag || undefined,
        focusTag: focusTag || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['pe', 'people'] });
    void queryClient.invalidateQueries({ queryKey: ['pe', 'people', 'summary'] });
  };

  const unflag = useMutation({
    mutationFn: (id: string) => peService.unflagPerson(id),
    onSuccess: () => {
      toast.success('Flag removed.');
      invalidate();
    },
    onError: (e: ApiError) => toast.error(e.message || 'Could not remove the flag.'),
  });

  const people = data?.people ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters = [roleTag !== '', focusTag !== '', !!search, !!firmFilter].filter(
    Boolean,
  ).length;

  function clearAll() {
    setRoleTag('');
    setFocusTag('');
    setFirmFilter('');
    setSearchInput('');
    setSearch('');
    setPage(0);
  }

  return (
    <div className="pep-scope">
      <div className="pep-filters">
        {!hideSearch && (
          <div className="pep-search">
            <i className="bi bi-search pep-search__icon" aria-hidden="true" />
            <input
              id="people-search"
              type="search"
              className="pep-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, title, or bio…"
              aria-label="Search people"
            />
          </div>
        )}
        {showFirmFilter && (
          <PillSelect
            className="pep-pill--firm"
            aria-label="All firms"
            options={firmOptions}
            value={firmFilter}
            onChange={setFirmFilter}
          />
        )}
        <PillSelect
          className="pep-pill--role"
          aria-label="All roles"
          options={ROLE_OPTIONS}
          value={roleTag}
          onChange={setRoleTag}
        />
        <PillSelect
          className="pep-pill--focus"
          aria-label="All focus areas"
          options={FOCUS_OPTIONS}
          value={focusTag}
          onChange={setFocusTag}
        />
        {activeFilters > 0 && (
          <button type="button" className="pep-btn pep-btn--ghost" onClick={clearAll}>
            <i className="bi bi-x" aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      {isPending ? (
        <div className="pep-grid" aria-busy="true" aria-label="Loading people">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pep-skeleton-card">
              <div className="pep-skeleton-card__top">
                <Skel w={56} h={56} />
                <div className="pep-skeleton-card__lines">
                  <Skel w={120} h={14} />
                  <Skel w={80} h={12} />
                </div>
              </div>
              <Skel w={200} h={40} />
            </div>
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="pep-empty">No people found.</div>
      ) : (
        <>
          <div
            className={`pep-grid${isFetching ? ' is-fetching' : ''}`}
            data-testid="pe-people-grid"
          >
            {people.map((p) => (
              <PersonCard
                key={p.id}
                person={p}
                showFirm={showFirmFilter}
                isStaff={isStaff}
                onFocusClick={(tag) => {
                  setFocusTag(tag);
                  setPage(0);
                }}
                onFlag={setFlagTarget}
                onUnflag={(id) => unflag.mutate(id)}
                unflagPending={unflag.isPending}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          <div className="pep-footer">
            <p className="pep-footer__count">
              {total === 0
                ? 'No people'
                : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
            </p>
            {totalPages > 1 && (
              <nav aria-label="People pagination" className="pep-pagination">
                <button
                  type="button"
                  className="pep-btn"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="pep-pagination__page">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  className="pep-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </>
      )}

      <FlagModal
        person={flagTarget}
        onClose={() => setFlagTarget(null)}
        onInvalidate={invalidate}
      />
      <DeleteModal
        person={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onInvalidate={invalidate}
      />
    </div>
  );
}
