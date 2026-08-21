// Presentational primitives for the PE Talent Flow surface (F33.2). Component-only (per react-refresh);
// non-component utilities/labels live in ./talentFlowUtils. Styling follows the repo's Bootstrap-class
// convention (NOT the reference's Tailwind), reusing the shared UI primitives (Badge, Tooltip). Tables-
// first v1 — no chart library (user decision 2026-07-07): gainers/losers ship as plain stat rows.
import { Link } from 'react-router-dom';
import { Badge, Tooltip } from '@/components/ui';
import { paths } from '@/routes/paths';
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_TONE,
  fmtNet,
  fmtNum,
} from '@/components/pe/talentFlow/talentFlowUtils';
import type { PEFirmFlow, PEMoveConfidence } from '@/types';

/** high/medium/low confidence pill. */
export function ConfidenceBadge({ confidence }: { confidence: PEMoveConfidence }) {
  return (
    <Badge tone={CONFIDENCE_TONE[confidence]} className="talent-confidence-badge">
      <span data-testid="confidence-badge" data-confidence={confidence}>
        {CONFIDENCE_LABELS[confidence]}
      </span>
    </Badge>
  );
}

/** The corroboration reasons for a move, shown as an info tooltip revealing a bulleted list.
 *  Renders nothing when there are no reasons. */
export function ReasonsTooltip({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return <span className="text-muted small">—</span>;
  return (
    <Tooltip
      content={
        <ul className="mb-0 ps-3 text-start" data-testid="reasons-list">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      }
    >
      <span className="badge bg-light text-dark border" data-testid="reasons-count">
        {reasons.length} {reasons.length === 1 ? 'reason' : 'reasons'}
      </span>
    </Tooltip>
  );
}

/** A verified-identity indicator: a check when the move is LinkedIn-anchored, a muted dash otherwise. */
export function LinkedinMatchIndicator({ match }: { match: boolean }) {
  return match ? (
    <span
      className="text-success"
      title="Matched by LinkedIn profile"
      data-testid="linkedin-match"
      data-match="true"
    >
      <i className="bi bi-linkedin" aria-hidden="true" />{' '}
      <span className="visually-hidden">LinkedIn matched</span>
    </span>
  ) : (
    <span
      className="text-muted"
      data-testid="linkedin-match"
      data-match="false"
      aria-label="Not LinkedIn matched"
    >
      —
    </span>
  );
}

/** One firm net-flow panel (gainers or losers): firm link, arrivals, departures, signed net. */
export function FlowPanel({
  title,
  description,
  rows,
  loading,
  testId,
}: {
  title: string;
  description: string;
  rows: PEFirmFlow[];
  loading: boolean;
  testId?: string;
}) {
  return (
    <div className="card h-100" data-testid={testId}>
      <div className="card-body">
        <h2 className="h5 mb-1">{title}</h2>
        <p className="text-muted small mb-3">{description}</p>
        {loading ? (
          <div className="text-muted small py-3 text-center">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-muted small py-3 text-center">No firms in this window yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Firm</th>
                  <th scope="col" className="text-end">
                    Arrivals
                  </th>
                  <th scope="col" className="text-end">
                    Departures
                  </th>
                  <th scope="col" className="text-end">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.firmId}>
                    <td className="fw-medium">
                      <Link to={paths.pe.firm(r.firmId)}>{r.firmName ?? '—'}</Link>
                    </td>
                    <td className="text-end text-success">{fmtNum(r.arrivals)}</td>
                    <td className="text-end text-danger">{fmtNum(r.departures)}</td>
                    <td
                      className={`text-end fw-semibold ${r.net > 0 ? 'text-success' : r.net < 0 ? 'text-danger' : 'text-muted'}`}
                    >
                      {fmtNet(r.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
