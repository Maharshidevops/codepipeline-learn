// What the enrichment drain actually decided about one holding.
//
// The GICS / URL / location passes each write a per-company row to their own ledger
// (`pe_tool_*_results`) carrying the real answer — a sector, a URL, a city. Those rows are
// stamped with the platform sentinel so they stay out of the org-scoped Data Tools surface,
// which meant nothing in the app could read them: the passes reported `classified=40` and the
// holdings table showed 15 sectors, and there was no way to see which was which.
//
// Two things this deliberately shows that a table column cannot:
//   * `not found` as a first-class outcome — the pass ran and could not answer. A column would
//     render that identically to "never ran", and they are different facts.
//   * GICS at all. `holding.sector` carries the INVESTOR vocabulary written by description_infer;
//     the GICS taxonomy is a separate vocabulary that is ledger-only by design (F60 13.1), so
//     this panel is its only read path.
import { useQuery } from '@tanstack/react-query';
import { peService } from '@/services/api';
import type { PEEnrichmentLeg, PEHoldingEnrichment } from '@/types';

/** A `found`/`not found` pill. The ledger's verdict, not our inference. */
function StatusChip({ leg }: { leg: PEEnrichmentLeg }) {
  const found = leg.status === 'found';
  const label = found ? 'found' : leg.status === 'not_found' ? 'not found' : leg.status;
  return (
    <span className={`peh-enr__status peh-enr__status--${found ? 'found' : 'missing'}`}>
      {label}
      {leg.confidence && leg.confidence !== 'not_found' && (
        <span className="peh-enr__conf"> · {leg.confidence}</span>
      )}
    </span>
  );
}

/** "Machinery (201060)" — the code makes the row joinable on standard GICS rather than on a
 *  display string, and makes the level unambiguous when two levels share a name. */
function withCode(name: string | null | undefined, code: string | null | undefined): string | null {
  if (!name) return null;
  return code ? `${name} (${code})` : name;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="peh-enr__field">
      <dt>{label}</dt>
      <dd>{value ? value : <span className="peh-team__muted">—</span>}</dd>
    </div>
  );
}

/** The model's own justification, collapsed.
 *
 * Answers "why is this company Consumer Discretionary?", which is otherwise unanswerable from
 * the UI — the reason F70 Unit D asked the classifier for it in the first place. It stayed
 * invisible for a while because the API sent it and this panel dropped it on the floor.
 *
 * Collapsed by default and rendered OUTSIDE the `<dl>`: it is prose, not a term/definition pair,
 * and at up to 160 characters (`_REASON_MAX_CHARS`) it would dominate a four-row field list that
 * exists to be scanned. `<details>` rather than a state toggle so it is keyboard-operable and
 * screen-reader-announced for free.
 */
function Reasoning({ text }: { text: string }) {
  return (
    <details className="peh-enr__reason">
      <summary>Why this classification?</summary>
      <p>{text}</p>
    </details>
  );
}

/** One pass. `leg === null` means the pass has not covered this holding yet — said plainly
 *  rather than rendered as an empty row, which would read as "ran and found nothing". */
function Section({
  title,
  leg,
  children,
  footer,
}: {
  title: string;
  leg: PEEnrichmentLeg | null;
  children?: React.ReactNode;
  /** Rendered after the field list. `<dl>` may only contain dt/dd/div, so prose lives here. */
  footer?: React.ReactNode;
}) {
  return (
    <section className="peh-enr__section">
      {/* h3 under the page h1: the visual size is set in CSS, so the level is free to be
          semantically correct. DealTeamPanel above uses a span, so this panel owns the first
          real heading inside the expanded row and must not skip a level. */}
      <h3 className="peh-enr__heading">
        {title}
        {leg ? <StatusChip leg={leg} /> : <span className="peh-enr__status">not run yet</span>}
      </h3>
      {leg ? (
        <>
          <dl className="peh-enr__fields">{children}</dl>
          {footer}
        </>
      ) : (
        <p className="peh-team__muted">This pass has not reached this company yet.</p>
      )}
      {leg?.errorMessage && <p className="peh-enr__error">{leg.errorMessage}</p>}
    </section>
  );
}

export interface EnrichmentPanelProps {
  holdingId: string;
  companyName: string;
}

export default function EnrichmentPanel({ holdingId, companyName }: EnrichmentPanelProps) {
  const query = useQuery({
    queryKey: ['pe', 'holding', holdingId, 'enrichment'],
    queryFn: () => peService.getHoldingEnrichment(holdingId),
  });

  if (query.isPending) {
    return (
      <div className="peh-enr" data-testid="enrichment-loading">
        <p className="peh-team__muted">Loading enrichment data…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="peh-enr">
        <p className="peh-team__muted" role="status">
          Could not load enrichment data for {companyName}.
        </p>
      </div>
    );
  }

  const { gics, url, location }: PEHoldingEnrichment = query.data;

  return (
    <div className="peh-enr" data-testid="enrichment-panel">
      <h2 className="peh-enr__title">Enrichment</h2>
      <div className="peh-enr__grid">
        <Section
          title="GICS"
          leg={gics}
          footer={gics?.reasoning ? <Reasoning text={gics.reasoning} /> : null}
        >
          {/* Every level carries its code, sector included. It was the one level rendered
              without one, which read as a missing value next to "Industry group (2520)"
              rather than as the deliberate omission it never was. */}
          <Field label="Sector" value={withCode(gics?.sector, gics?.sectorCode)} />
          <Field
            label="Industry group"
            value={withCode(gics?.industryGroup, gics?.industryGroupCode)}
          />
          <Field label="Industry" value={withCode(gics?.industry, gics?.industryCode)} />
          <Field label="Sub-industry" value={withCode(gics?.subIndustry, gics?.subIndustryCode)} />
        </Section>

        <Section title="Website lookup" leg={url}>
          <Field label="URL" value={url?.url ?? null} />
          <Field label="Location" value={url?.location ?? null} />
          <Field label="Description" value={url?.description ?? null} />
        </Section>

        <Section title="Location" leg={location}>
          <Field label="City" value={location?.city ?? null} />
          <Field label="State / region" value={location?.stateRegion ?? null} />
          <Field label="Country" value={location?.country ?? null} />
        </Section>
      </div>
    </div>
  );
}
