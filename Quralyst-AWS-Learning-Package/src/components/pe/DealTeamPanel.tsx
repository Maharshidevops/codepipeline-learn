// PE deal team — the panel that opens inside an expanded holding row (F66 Unit 4).
//
// Mirrors the reference `HoldingTeamPanel` (artifacts/pe-scraper/src/pages/FirmDetail.tsx:285):
// a `Deal Team (N)` heading with `N direct` / `N <sector> focus` / `Firm lead` count chips, then
// a card per person carrying an avatar, the DIRECT / FIRM LEAD marker, role badge, and contact
// links.
//
// Why the badges matter more than they look: only `direct` means the holding is actually named in
// that person's bio or portfolio list. `sector` is an inference from their focus area, and
// `fallback` is the firm's senior investment lead standing in because nothing matched at all. A
// user acting on a contact needs to know which of the three they are looking at, so the tier is
// never rendered as a bare list.
import { useQuery } from '@tanstack/react-query';
import { peService } from '@/services/api';
import type { PEPerson } from '@/types';

const ROLE_LABEL: Record<string, string> = {
  investment: 'Investment',
  operations: 'Operations',
  finance: 'Finance',
  support: 'Support',
  advisory: 'Advisory',
  advisor: 'Advisory', // pre-F66 rows
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
}

function TeamCard({ person }: { person: PEPerson }) {
  const isDirect = person.matchType === 'direct';
  const isFallback = person.matchType === 'fallback';
  const cardClass = `peh-team__card${
    isDirect ? ' peh-team__card--direct' : isFallback ? ' peh-team__card--fallback' : ''
  }`;

  return (
    <li className={cardClass}>
      {person.photoUrl ? (
        <img className="peh-team__avatar" src={person.photoUrl} alt="" aria-hidden="true" />
      ) : (
        <span className="peh-team__avatar peh-team__avatar--initials" aria-hidden="true">
          {initials(person.name)}
        </span>
      )}
      <div className="peh-team__body">
        <p className="peh-team__name">
          {person.name}
          {isDirect && (
            <span
              className="peh-team__chip peh-team__chip--direct"
              title="This company is named in their bio or portfolio list"
            >
              Direct
            </span>
          )}
          {isFallback && (
            <span
              className="peh-team__chip peh-team__chip--fallback"
              title="No direct or sector match for this company — showing the firm's senior-most investment professional"
            >
              Firm Lead
            </span>
          )}
        </p>
        {person.title && <p className="peh-team__title">{person.title}</p>}
        {person.roleTag && (
          <span className="peh-team__role">{ROLE_LABEL[person.roleTag] ?? person.roleTag}</span>
        )}
        <p className="peh-team__contacts">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              title={person.email}
              aria-label={`Email ${person.name}`}
            >
              <i className="bi bi-envelope" aria-hidden="true" />
            </a>
          )}
          {person.phone && (
            <a href={`tel:${person.phone}`} title={person.phone} aria-label={`Call ${person.name}`}>
              <i className="bi bi-telephone" aria-hidden="true" />
            </a>
          )}
          {person.linkedinUrl && (
            <a
              href={person.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              title="LinkedIn"
              aria-label={`${person.name} on LinkedIn`}
            >
              <i className="bi bi-linkedin" aria-hidden="true" />
            </a>
          )}
        </p>
      </div>
    </li>
  );
}

export interface DealTeamPanelProps {
  holdingId: string;
  companyName: string;
}

export default function DealTeamPanel({ holdingId, companyName }: DealTeamPanelProps) {
  const teamQuery = useQuery({
    queryKey: ['pe', 'holding', holdingId, 'team'],
    queryFn: () => peService.getHoldingTeam(holdingId),
  });

  if (teamQuery.isPending) {
    return (
      <div className="peh-team" data-testid="deal-team-loading">
        <p className="peh-team__muted">Loading the deal team…</p>
      </div>
    );
  }

  if (teamQuery.isError || !teamQuery.data) {
    return (
      <div className="peh-team">
        <p className="peh-team__muted" role="status">
          Could not load the deal team for {companyName}.
        </p>
      </div>
    );
  }

  const { people, sector, directCount, sectorCount, fallbackCount } = teamQuery.data;

  if (people.length === 0) {
    return (
      <div className="peh-team">
        <p className="peh-team__muted">
          No deal team members linked — this firm has no people scraped yet, or none could be
          matched to {companyName}.
        </p>
      </div>
    );
  }

  return (
    <div className="peh-team">
      <div className="peh-team__head">
        <span className="peh-team__heading">
          <i className="bi bi-people" aria-hidden="true" />
          Deal Team ({people.length})
        </span>
        {directCount > 0 && (
          <span className="peh-team__count peh-team__count--direct">{directCount} direct</span>
        )}
        {sectorCount > 0 && (
          <span className="peh-team__count">
            {sectorCount} {sector ?? 'sector'} focus
          </span>
        )}
        {fallbackCount > 0 && (
          <span className="peh-team__count peh-team__count--fallback">Firm lead</span>
        )}
        {directCount === 0 && sectorCount > 0 && (
          <span className="peh-team__note">No direct mention found — matched by sector focus</span>
        )}
        {directCount === 0 && sectorCount === 0 && fallbackCount > 0 && (
          <span className="peh-team__note">
            No direct or sector match — showing the firm’s senior investment lead
          </span>
        )}
      </div>
      <ul className="peh-team__grid">
        {people.map((p) => (
          <TeamCard key={p.id} person={p} />
        ))}
      </ul>
    </div>
  );
}
