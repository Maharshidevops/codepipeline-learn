import { usePermissions } from '@/hooks/usePermissions';
// PE Dataset — Team Directory (F25.3). Layout port of QURALYST-20 People.tsx:
// toolbar (search + Export/Admin/scrape) → heading → stats + role pills → filters →
// card grid → By Firm. Batch ops stream over the shared SSE seam (PeopleBatchModal).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import PeopleTable from '@/components/pe/PeopleTable';
import PeopleSummary, { PeopleByFirm } from '@/components/pe/PeopleSummary';
import PeopleBatchModal, { type PeopleBatchOp } from '@/components/pe/PeopleBatchModal';
import PeopleExportModal from '@/components/pe/PeopleExportModal';
import { peService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import '@/styles/pages/pe-people.css';

const BATCH_ACTIONS: { op: PeopleBatchOp; label: string; group: string }[] = [
  { op: 'tag', label: 'Tag by role', group: 'AI Tagging' },
  { op: 'tagFocus', label: 'Tag focus areas', group: 'AI Tagging' },
  { op: 'scrapeBatch', label: 'Re-scrape low-bio firms', group: 'Scraping' },
  { op: 'findEmails', label: 'Find missing emails', group: 'Email Enrichment' },
  { op: 'verifyEmails', label: 'Verify emails', group: 'Email Enrichment' },
  { op: 'contactEnrich', label: 'Enrich contacts', group: 'Email Enrichment' },
];

const ADMIN_GROUPS = ['AI Tagging', 'Scraping', 'Email Enrichment'] as const;

export default function PEPeoplePage() {
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const queryClient = useQueryClient();
  const toast = useToast();
  const [batchOp, setBatchOp] = useState<PeopleBatchOp | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [roleTag, setRoleTag] = useState('');
  const adminRef = useRef<HTMLDivElement>(null);

  const firmsQuery = useQuery({
    queryKey: ['pe', 'firms', 'options'],
    queryFn: () => peService.listFirmOptions(),
    staleTime: 60_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['pe', 'people'] });
    void queryClient.invalidateQueries({ queryKey: ['pe', 'people', 'summary'] });
  };

  const scrapeAll = useMutation({
    mutationFn: async () => {
      const ids = (firmsQuery.data ?? []).map((f) => f.id);
      if (!ids.length) throw new Error('No firms');
      return peService.scrapeByFirms(ids);
    },
    onSuccess: () => {
      toast.success('People scrape queued for all firms.');
      invalidate();
    },
    onError: () => toast.error('Could not queue scrape-all.'),
  });

  const forceRescrape = useMutation({
    mutationFn: async () => {
      const ids = (firmsQuery.data ?? []).map((f) => f.id);
      if (!ids.length) throw new Error('No firms');
      return peService.scrapeBatch(ids);
    },
    onSuccess: () => {
      toast.success('Force re-scrape queued.');
      invalidate();
    },
    onError: () => toast.error('Could not queue force re-scrape.'),
  });

  useEffect(() => {
    if (!adminOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAdminOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [adminOpen]);

  const busy = scrapeAll.isPending || forceRescrape.isPending;

  return (
    <div className="pep-page">
      <div className="pep-toolbar">
        <div className="pep-toolbar__left">
          <div className="pep-search">
            <i className="bi bi-search pep-search__icon" aria-hidden="true" />
            <input
              type="search"
              className="pep-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, title, or bio…"
              aria-label="Search people"
            />
          </div>
        </div>

        <div className="pep-toolbar__right">
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => setExportOpen(true)}
            icon={<i className="bi bi-download" aria-hidden="true" />}
          >
            Export CSV
          </Button>

          {isStaff && (
            <>
              <div className="pep-admin" ref={adminRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  pill
                  aria-haspopup="menu"
                  aria-expanded={adminOpen}
                  onClick={() => setAdminOpen((v) => !v)}
                  icon={<i className="bi bi-gear" aria-hidden="true" />}
                >
                  Admin
                  {batchOp && <span className="pep-admin__pulse" aria-hidden="true" />}
                </Button>
                {adminOpen && (
                  <ul className="pep-admin__menu" role="menu" aria-label="Batch operations">
                    {ADMIN_GROUPS.map((group) => {
                      const items = BATCH_ACTIONS.filter((a) => a.group === group);
                      if (items.length === 0) return null;
                      return (
                        <li key={group} role="presentation">
                          <div className="pep-admin__label">{group}</div>
                          {items.map((a) => (
                            <button
                              key={a.op}
                              type="button"
                              role="menuitem"
                              className="pep-admin__item"
                              onClick={() => {
                                setBatchOp(a.op);
                                setAdminOpen(false);
                              }}
                            >
                              {a.label}
                            </button>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                pill
                disabled={busy || !firmsQuery.data?.length}
                title="Re-scrape people for every firm"
                onClick={() => forceRescrape.mutate()}
                icon={
                  <i
                    className={`bi bi-arrow-repeat${forceRescrape.isPending ? ' pep-spin' : ''}`}
                    aria-hidden="true"
                  />
                }
              >
                {forceRescrape.isPending ? 'Rescraping…' : 'Force All Rescrape'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                pill
                disabled={busy || !firmsQuery.data?.length}
                onClick={() => scrapeAll.mutate()}
                icon={
                  <i
                    className={`bi bi-arrow-repeat${scrapeAll.isPending ? ' pep-spin' : ''}`}
                    aria-hidden="true"
                  />
                }
              >
                {scrapeAll.isPending ? 'Scraping…' : 'Scrape All Firms'}
              </Button>
            </>
          )}
        </div>
      </div>

      <header className="pep-header">
        <nav className="pep-crumb" aria-label="Breadcrumb">
          <Link to={paths.pe.firms}>Private Equity</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span className="pep-crumb__current">People</span>
        </nav>
        <h1 className="pep-header__title">Team Directory</h1>
        <p className="pep-header__sub">Bios and contact info scraped from PE firm team pages.</p>
      </header>

      <PeopleSummary roleTag={roleTag} onRoleChange={setRoleTag} />

      <PeopleTable
        hideSearch
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        roleTag={roleTag}
        onRoleTagChange={setRoleTag}
      />

      <PeopleByFirm />

      <PeopleBatchModal op={batchOp} onClose={() => setBatchOp(null)} onDone={invalidate} />
      <PeopleExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
