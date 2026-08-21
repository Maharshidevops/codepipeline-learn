// PE People — coverage summary (F25.3). Q20 order: 5 soft stat tiles + clickable role-breakdown
// pills. By Firm lives in PeopleByFirm (rendered below the card grid on the page).
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import '@/styles/pages/pe-people.css';

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + pick(row), 0);
}

function Skel({ w, h = 28 }: { w: number; h?: number }) {
  return <span className="pep-skel" style={{ width: w, height: h }} />;
}

const ROLE_LABEL: Record<string, string> = {
  investment: 'Investment',
  operations: 'Operations',
  advisor: 'Advisor',
  other: 'Other',
};

function rolePillClass(role: string, active: boolean): string {
  const base =
    role === 'investment' || role === 'operations' || role === 'advisor' || role === 'other'
      ? `pep-role-pill pep-role-pill--${role}`
      : 'pep-role-pill pep-role-pill--other';
  return active ? `${base} is-active` : base;
}

export interface PeopleSummaryProps {
  roleTag?: string;
  onRoleChange?: (role: string) => void;
}

export default function PeopleSummary({ roleTag = '', onRoleChange }: PeopleSummaryProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['pe', 'people', 'summary'],
    queryFn: () => peService.getPeopleSummary(),
  });

  const totals = useMemo(() => {
    const firms = data?.firms ?? [];
    return {
      withLinkedin: sum(firms, (f) => f.withLinkedin),
      withBio: sum(firms, (f) => f.withBio),
    };
  }, [data]);

  if (isError) return <p className="text-muted">Coverage summary unavailable.</p>;

  const stats: { label: string; value: number; tone?: 'emerald' | 'sky' }[] = data
    ? [
        { label: 'People tracked', value: data.total },
        { label: 'Firms with data', value: data.firms.length },
        { label: 'With bios', value: totals.withBio, tone: 'emerald' },
        { label: 'Tagged', value: data.tagged },
        { label: 'With LinkedIn', value: totals.withLinkedin, tone: 'sky' },
      ]
    : [
        { label: 'People tracked', value: 0 },
        { label: 'Firms with data', value: 0 },
        { label: 'With bios', value: 0, tone: 'emerald' },
        { label: 'Tagged', value: 0 },
        { label: 'With LinkedIn', value: 0, tone: 'sky' },
      ];

  return (
    <div className="pep-summary">
      <div className="pep-stats" aria-label="People coverage">
        {stats.map((s) => (
          <div key={s.label} className="pep-stat">
            {isPending ? (
              <Skel w={48} h={28} />
            ) : (
              <p
                className={`pep-stat__value${
                  s.tone === 'emerald'
                    ? ' pep-stat__value--emerald'
                    : s.tone === 'sky'
                      ? ' pep-stat__value--sky'
                      : ''
                }`}
              >
                {s.value.toLocaleString()}
              </p>
            )}
            <p className="pep-stat__label">{s.label}</p>
          </div>
        ))}
      </div>

      {data && data.tagDistribution.length > 0 && (
        <div className="pep-role-pills" aria-label="Role breakdown">
          <span className="pep-role-breakdown__label">Role breakdown:</span>
          {data.tagDistribution.map((d) => {
            const active = roleTag === d.role;
            return (
              <button
                key={d.role}
                type="button"
                className={rolePillClass(d.role, active)}
                onClick={() => onRoleChange?.(active ? '' : d.role)}
              >
                {ROLE_LABEL[d.role] ?? d.role}
                <span className="pep-role-pill__count">{d.count.toLocaleString()}</span>
              </button>
            );
          })}
          {roleTag && (
            <button
              type="button"
              className="pep-btn pep-btn--ghost"
              onClick={() => onRoleChange?.('')}
            >
              <i className="bi bi-x" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Q20 By Firm list — rendered below the people card grid. */
export function PeopleByFirm() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['pe', 'people', 'summary'],
    queryFn: () => peService.getPeopleSummary(),
  });
  const firmsQuery = useQuery({
    queryKey: ['pe', 'firms', 'options'],
    queryFn: () => peService.listFirmOptions(),
  });

  const scrape = useMutation({
    mutationFn: (firmId: string) => peService.scrapePeople(firmId),
    onSuccess: (_d, firmId) => {
      const name =
        data?.firms.find((f) => f.firmId === firmId)?.firmName ??
        firmsQuery.data?.find((f) => f.id === firmId)?.name ??
        'Firm';
      toast.success(`People scrape queued for ${name}.`);
      void queryClient.invalidateQueries({ queryKey: ['pe', 'people'] });
    },
    onError: () => toast.error('Could not queue people scrape.'),
  });

  if (!data || data.total === 0) return null;

  const coveredIds = new Set(data.firms.map((f) => f.firmId));
  const unscrape = (firmsQuery.data ?? []).filter((f) => !coveredIds.has(f.id));

  return (
    <div className="pep-firm-list">
      <div className="pep-firm-list__head">By Firm</div>
      {data.firms.map((f) => (
        <div key={f.firmId} className="pep-firm-list__row">
          <div className="pep-firm-list__main">
            <span className="pep-firm-list__name">{f.firmName}</span>
            <span className="pep-firm-list__count">{f.count.toLocaleString()} people</span>
            <div className="pep-firm-list__meta">
              {f.withLinkedin > 0 && (
                <span className="pep-meta--li">{f.withLinkedin} LinkedIn</span>
              )}
              {f.withEmail > 0 && (
                <span className="pep-meta--email">{f.withEmail} confirmed email</span>
              )}
              {f.withInferredEmail > 0 && (
                <span className="pep-meta--inferred">{f.withInferredEmail} inferred</span>
              )}
              {f.withBio > 0 && <span className="pep-meta--bio">{f.withBio} bios</span>}
              {f.withTags > 0 && <span className="pep-meta--tag">{f.withTags} tagged</span>}
            </div>
          </div>
          <button
            type="button"
            className="pep-btn pep-btn--ghost"
            disabled={scrape.isPending && scrape.variables === f.firmId}
            onClick={() => scrape.mutate(f.firmId)}
          >
            <i
              className={`bi bi-arrow-repeat${
                scrape.isPending && scrape.variables === f.firmId ? ' pep-spin' : ''
              }`}
              aria-hidden="true"
            />
            Re-scrape
          </button>
        </div>
      ))}
      {unscrape.map((f) => (
        <div key={f.id} className="pep-firm-list__row pep-firm-list__row--muted">
          <div className="pep-firm-list__main">
            <span className="pep-firm-list__name">{f.name}</span>
            <span className="pep-firm-list__count">not scraped yet</span>
          </div>
          <button
            type="button"
            className="pep-btn pep-btn--ghost"
            disabled={scrape.isPending && scrape.variables === f.id}
            onClick={() => scrape.mutate(f.id)}
          >
            <i
              className={`bi bi-arrow-repeat${
                scrape.isPending && scrape.variables === f.id ? ' pep-spin' : ''
              }`}
              aria-hidden="true"
            />
            Scrape
          </button>
        </div>
      ))}
    </div>
  );
}
