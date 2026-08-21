// IB Vertical — IB Professionals page (F34.4).
// Port of Replit QURALYST-20/artifacts/pe-scraper/src/pages/IBAllPeople.tsx:
//   • Load all people once → client-side filter + paginate (48/page)
//   • 4-up stat cards: Total Professionals / With LinkedIn / With Email / Banks Covered
//   • Responsive card grid (1→2→3→4 cols) with violet avatar initials,
//     expandable bio, email (+ inferred badge) / LinkedIn / location footer
//   • CSV export of filtered rows
// Gated by RoleRoute role="pe_dataset". Types: `src/types/ib.ts`.
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ibService } from '@/services/api';
import { ibKeys } from '@/components/pe/ib/ibKeys';
import { paths } from '@/routes/paths';
import type { IBPerson } from '@/types';
import { Button, Select } from '@/components/ui';
import '@/styles/pages/ib-people.css';

const PAGE_SIZE = 48;
const STALE = 60_000;

// ── Initials helper ───────────────────────────────────────────────────────────
function initials(name: string): string {
  const cleanName = formatName(name);
  return cleanName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
}

// ── String cleaners for raw dictionary values ────────────────────────────────
function formatName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.startsWith('{') && (trimmed.includes("'name':") || trimmed.includes('"name":'))) {
    const match = trimmed.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/);
    if (match && match[1]) return match[1];
  }
  return name;
}

function formatTitle(title: string | null | undefined): string {
  if (!title) return '';
  const trimmed = title.trim();
  if (trimmed.startsWith('{') && (trimmed.includes("'name':") || trimmed.includes('"name":'))) {
    const match = trimmed.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/);
    if (match && match[1]) return match[1];
  }
  return title;
}

// ── CSV export ────────────────────────────────────────────────────────────────
function downloadCSV(rows: IBPerson[]) {
  const headers = ['Name', 'Title', 'Bank', 'Email', 'LinkedIn', 'Location', 'Bio'];
  const esc = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        formatName(r.name),
        formatTitle(r.title),
        r.bankName,
        r.email,
        r.linkedinUrl,
        r.location,
        r.bio,
      ]
        .map(esc)
        .join(','),
    ),
  ];
  const blob = new Blob(['\uFEFF', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ib-people-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── Skeleton block ────────────────────────────────────────────────────────────
function Skel({ w, h = 14 }: { w: number; h?: number }) {
  return <span className="ppl-skel" style={{ width: w, height: h }} />;
}

// ── Person card (PE People layout parity) ──────────────────────────────────────
function PersonCard({ person }: { person: IBPerson }) {
  const [expanded, setExpanded] = useState(false);
  const name = formatName(person.name);
  const title = formatTitle(person.title);
  const bioTruncated = !!person.bio && person.bio.length > 180;
  const hasFooter = !!(person.scrapedAt || person.location);

  return (
    <article className="ppl-card">
      <div className="ppl-card__top">
        <div className="ppl-avatar" aria-hidden="true">
          {person.imageUrl ? (
            <img src={person.imageUrl} alt={name} className="ppl-avatar__img" />
          ) : (
            initials(person.name)
          )}
        </div>
        <div className="ppl-card__identity">
          <div className="ppl-card__name-row">
            <div className="ppl-card__name-block">
              <p className="ppl-card__name" title={name}>
                {name}
              </p>
              {title && (
                <p className="ppl-card__title" title={title}>
                  {title}
                </p>
              )}
            </div>
            <div className="ppl-card__contacts">
              {person.linkedinUrl && (
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} on LinkedIn`}
                  title="LinkedIn"
                >
                  <i className="bi bi-linkedin" aria-hidden="true" />
                </a>
              )}
              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  title={person.email}
                  aria-label={person.email}
                  className="ppl-card__email"
                >
                  <i className="bi bi-envelope" aria-hidden="true" />
                </a>
              )}
              {person.bankWebsite && (
                <a
                  href={person.bankWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View website"
                  aria-label={`${name} bank website`}
                >
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
          {person.bankId && (
            <div className="ppl-card__firm">
              <i className="bi bi-building" aria-hidden="true" />
              <Link
                to={paths.ib.bank(person.bankId)}
                className="ppl-card__bank"
                title={person.bankName ?? ''}
              >
                {person.bankName ?? '—'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {person.bio && (
        <div>
          <p className="ppl-card__bio">
            {expanded || !bioTruncated ? person.bio : `${person.bio.slice(0, 180)}…`}
          </p>
          {bioTruncated && (
            <button
              type="button"
              className="ppl-card__bio-toggle"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      <div className="ppl-card__tags">
        {person.email && person.emailInferred && (
          <span
            className="ppl-card__inferred"
            data-testid="inferred-email"
            title="Inferred from first.last@domain pattern"
          >
            Inferred
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

      {hasFooter && (
        <div className="ppl-card__footer">
          <span>
            {person.scrapedAt ? `Last seen ${new Date(person.scrapedAt).toLocaleDateString()}` : ''}
          </span>
          {person.location && <span className="ppl-card__location">{person.location}</span>}
        </div>
      )}
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IBPeoplePage() {
  const [search, setSearch] = useState('');
  const [bankFilter, setBankFilter] = useState('all');
  const [titleFilter, setTitle] = useState('');
  const [page, setPage] = useState(0);

  // Load ALL people once — client-side filter (matches Replit)
  const { data: allPeople = [], isLoading } = useQuery({
    queryKey: ibKeys.people({}),
    queryFn: () => ibService.listPeople(),
    staleTime: STALE,
  });

  const { data: banks = [] } = useQuery({
    queryKey: ibKeys.banks(),
    queryFn: () => ibService.listBanks(),
    staleTime: STALE,
  });

  // ── Derived stats ─────────────────────────────────────────────────────────
  const withLinkedIn = useMemo(() => allPeople.filter((p) => p.linkedinUrl).length, [allPeople]);
  const withEmail = useMemo(() => allPeople.filter((p) => p.email).length, [allPeople]);
  const uniqueBanks = useMemo(() => new Set(allPeople.map((p) => p.bankId)).size, [allPeople]);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = allPeople;
    if (bankFilter !== 'all') rows = rows.filter((r) => r.bankId === bankFilter);
    if (titleFilter.trim()) {
      const lq = titleFilter.toLowerCase();
      rows = rows.filter((r) => r.title?.toLowerCase().includes(lq));
    }
    if (search.trim()) {
      const lq = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(lq) ||
          r.title?.toLowerCase().includes(lq) ||
          (r.bankName ?? '').toLowerCase().includes(lq) ||
          r.bio?.toLowerCase().includes(lq),
      );
    }
    return rows;
  }, [allPeople, bankFilter, titleFilter, search]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const hasFilters = !!(search || bankFilter !== 'all' || titleFilter);

  function resetFilters() {
    setSearch('');
    setBankFilter('all');
    setTitle('');
    setPage(0);
  }

  return (
    <div className="ppl-page">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="ppl-header">
        <div>
          <h1 className="ppl-header__title">IB Professionals</h1>
          <p className="ppl-header__sub">
            Bankers and professionals across all tracked investment banks.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<i className="bi bi-download" aria-hidden="true" />}
          onClick={() => downloadCSV(filtered)}
          disabled={filtered.length === 0}
        >
          Download CSV ({filtered.length.toLocaleString()})
        </Button>
      </div>

      {/* ── Stats cards ───────────────────────────────────────────────── */}
      <div className="ppl-stats">
        {(
          [
            { icon: 'bi-people', label: 'Total Professionals', value: allPeople.length },
            { icon: 'bi-linkedin', label: 'With LinkedIn', value: withLinkedIn },
            { icon: 'bi-envelope', label: 'With Email', value: withEmail },
            { icon: 'bi-building', label: 'Banks Covered', value: uniqueBanks },
          ] as const
        ).map(({ icon, label, value }) => (
          <div key={label} className="ppl-stat">
            <div className="ppl-stat__label">
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
            </div>
            <div className="ppl-stat__value">
              {isLoading ? <Skel w={48} h={28} /> : value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="ppl-filters">
        <div className="ppl-filters__search">
          <i className="bi bi-search ppl-filters__search-icon" aria-hidden="true" />
          <input
            type="search"
            className="ppl-input ppl-input--search"
            placeholder="Search name, title, bio…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            aria-label="Search professionals"
          />
        </div>
        <Select
          value={bankFilter}
          onChange={(val) => {
            setBankFilter(val);
            setPage(0);
          }}
          options={[
            { value: 'all', label: 'All Banks' },
            ...banks.map((b) => ({ value: b.id, label: b.name })),
          ]}
          aria-label="Filter by bank"
        />
        <input
          type="text"
          className="ppl-input ppl-input--title"
          placeholder="Filter by title…"
          value={titleFilter}
          onChange={(e) => {
            setTitle(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by title"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="ppl-grid" aria-busy="true" aria-label="Loading professionals">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="ppl-skeleton-card">
              <div className="ppl-skeleton-card__top">
                <Skel w={48} h={48} />
                <div className="ppl-skeleton-card__lines">
                  <Skel w={120} h={14} />
                  <Skel w={80} h={12} />
                </div>
              </div>
              <Skel w={200} h={40} />
            </div>
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="ppl-empty" data-testid="ppl-empty">
          {allPeople.length === 0
            ? 'No professionals yet — scrape some banks to get started.'
            : 'No results match your filters.'}
        </div>
      ) : (
        <div className="ppl-grid" data-testid="ib-people-grid">
          {paginated.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="ppl-pagination">
          <span>
            {`${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()}`}
          </span>
          <div className="ppl-pagination__btns">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
