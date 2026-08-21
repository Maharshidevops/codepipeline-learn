// People tab (F29.2) — filterable, paginated people search over /api/pe/screener/people. Filters:
// search, firm id, title contains, roleTag, hasLinkedIn. Shows email provenance (source/inferred)
// + Kickbox verification badges. CSV export via export=true. Screener-specific table (consumes
// peScreenerService, NOT the self-contained F25.3 PeopleTable).
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, TextInput } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { peScreenerService } from '@/services/api';
import { peScreenerKeys } from './peScreenerKeys';
import { paths } from '@/routes/paths';
import { FilterChips, SelectFilter, YesNoFilter, type FilterChip } from './screenerHelpers';
import { downloadCsv, useDebounce } from './screenerUtils';
import type { PEScreenerPeopleQuery, PEScreenerPersonRow, PEScreenerYesNo } from '@/types';

const PAGE_SIZE = 50;

// F66 §2.2 — must match `utils/pe_people_link.ROLE_TAGS`; the previous list was
// `peopleTagger`'s four-value set, so `advisor`/`other` matched nothing and `finance`/`support`
// were unreachable. Keep in step with PeopleTable.ROLE_OPTIONS.
const ROLE_OPTIONS = [
  { value: 'investment', label: 'Investment' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'support', label: 'Support' },
  { value: 'advisory', label: 'Advisory' },
];

const VERIFY_TONE: Record<string, BadgeTone> = {
  deliverable: 'success',
  risky: 'warning',
  undeliverable: 'danger',
  unknown: 'secondary',
};

function EmailCell({ p }: { p: PEScreenerPersonRow }) {
  if (!p.email) return <span className="text-muted">—</span>;
  const verify = p.emailVerificationStatus;
  return (
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      <a href={`mailto:${p.email}`}>{p.email}</a>
      {p.emailInferred ? (
        <Badge tone="secondary">Inferred</Badge>
      ) : (
        p.emailSource && <Badge tone="info">{p.emailSource}</Badge>
      )}
      {verify && <Badge tone={VERIFY_TONE[verify] ?? 'secondary'}>{verify}</Badge>}
    </span>
  );
}

export default function PeopleScreenerTab() {
  const [search, setSearch] = useState('');
  const [firmId, setFirmId] = useState('');
  const [title, setTitle] = useState('');
  const [roleTag, setRoleTag] = useState('');
  const [hasLinkedIn, setHasLinkedIn] = useState<PEScreenerYesNo>('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState(false);

  const dSearch = useDebounce(search);
  const dTitle = useDebounce(title);

  const query: PEScreenerPeopleQuery = {
    search: dSearch || undefined,
    firmId: firmId || undefined,
    title: dTitle || undefined,
    roleTag: roleTag || undefined,
    hasLinkedIn: hasLinkedIn || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isFetching } = useQuery({
    queryKey: peScreenerKeys.people(query),
    queryFn: () => peScreenerService.listPeople(query),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setPage(0);
  }, [dSearch, firmId, dTitle, roleTag, hasLinkedIn]);

  const chips: FilterChip[] = [
    search && { key: 'search', label: `Search: "${search}"` },
    firmId && { key: 'firmId', label: `Firm: ${firmId}` },
    title && { key: 'title', label: `Title: "${title}"` },
    roleTag && { key: 'roleTag', label: `Role: ${roleTag}` },
    hasLinkedIn && {
      key: 'hasLinkedIn',
      label: `${hasLinkedIn === 'yes' ? 'Has' : 'No'} LinkedIn`,
    },
  ].filter(Boolean) as FilterChip[];

  function removeChip(k: string) {
    if (k === 'search') setSearch('');
    if (k === 'firmId') setFirmId('');
    if (k === 'title') setTitle('');
    if (k === 'roleTag') setRoleTag('');
    if (k === 'hasLinkedIn') setHasLinkedIn('');
  }

  function clearAll() {
    setSearch('');
    setFirmId('');
    setTitle('');
    setRoleTag('');
    setHasLinkedIn('');
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await peScreenerService.exportPeople(query);
      downloadCsv(
        'screener-people.csv',
        ['Name', 'Firm', 'Title', 'Role', 'Email', 'LinkedIn', 'Focus Tags'],
        rows.map((r) => [
          r.name,
          r.firmName,
          r.title ?? '',
          r.roleTag ?? '',
          r.email ?? '',
          r.linkedinUrl ?? '',
          (r.focusTags ?? []).join('; '),
        ]),
      );
    } finally {
      setExporting(false);
    }
  }

  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button variant="popup-secondary" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        <Button variant="popup-secondary" onClick={handleExport} loading={exporting}>
          Export CSV{data ? ` (${total.toLocaleString()})` : ''}
        </Button>
      </div>

      {showFilters && (
        <div className="pes-filters mb-3">
          <div className="row g-3">
            <div className="col-md-6">
              <span className="form-label d-block">Search</span>
              <div className="pes-search">
                <i className="bi bi-search pes-search__icon" aria-hidden="true" />
                <input
                  type="text"
                  className="pes-search__input"
                  placeholder="Name, title, bio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search people"
                />
              </div>
            </div>
            <div className="col-md-3">
              <span className="form-label d-block">Firm ID</span>
              <TextInput
                placeholder="e.g. pef1"
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
                aria-label="Filter by firm id"
              />
            </div>
            <div className="col-md-3">
              <TextInput
                label="Title Contains"
                placeholder="e.g. Partner, VP..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Title contains"
              />
            </div>
            <div className="col-md-3">
              <span className="form-label d-block">Role</span>
              <SelectFilter
                value={roleTag}
                onChange={setRoleTag}
                options={ROLE_OPTIONS}
                ariaLabel="Filter by role"
              />
            </div>
            <div className="col-md-3">
              <span className="form-label d-block">Has LinkedIn?</span>
              <YesNoFilter
                value={hasLinkedIn}
                onChange={(v) => setHasLinkedIn(v as PEScreenerYesNo)}
                ariaLabel="Has LinkedIn"
              />
            </div>
            {chips.length > 0 && (
              <div className="col-12 pt-1 border-top">
                <Button variant="clear-all-text" onClick={clearAll}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <FilterChips chips={chips} onRemove={removeChip} />

      <div className={`pes-table-wrap${isFetching ? ' is-fetching' : ''}`}>
        <table className="pes-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Firm</th>
              <th>Title</th>
              <th>Role</th>
              <th>Focus Areas</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={6} className="pes-empty">
                  <span className="spinner" aria-label="Loading" />
                </td>
              </tr>
            ) : data.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="pes-empty">
                  No people match your filters.
                </td>
              </tr>
            ) : (
              data.rows.map((p) => (
                <tr key={p.id}>
                  <td className="fw-medium">{p.name}</td>
                  <td>
                    <Link to={paths.pe.firm(p.firmId)} className="pes-firm-link">
                      {p.firmName}
                    </Link>
                  </td>
                  <td title={p.title ?? ''}>{p.title ?? '—'}</td>
                  <td>
                    {p.roleTag ? (
                      <span className={`pes-role pes-role--${p.roleTag}`}>{p.roleTag}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className="pes-kw">
                      {(p.focusTags ?? []).slice(0, 3).map((t) => (
                        <span key={t} className="pes-kw__chip">
                          {t}
                        </span>
                      ))}
                      {(p.focusTags ?? []).length > 3 && (
                        <span className="pes-footer__count">+{(p.focusTags ?? []).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      <EmailCell p={p} />
                      {p.linkedinUrl ? (
                        <a
                          href={p.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pes-web"
                        >
                          <i className="bi bi-linkedin" aria-hidden="true" />
                          LinkedIn
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="pes-footer">
          <p className="pes-footer__count">
            {total === 0 ? 'No results' : `${total.toLocaleString()} people`}
          </p>
          <div className="pes-pagination" role="group" aria-label="Pagination">
            <button
              type="button"
              className="pes-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="pes-footer__count">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="pes-btn"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
