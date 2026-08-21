// PE Holdings — edit drawer (F24.3). A Modal hosting two tabs:
//  • Edit — the four operator-editable fields (companyName required; sector/geography/
//    investmentDate clear to null when emptied). PATCH sends only changed fields; each field
//    carries a provenance badge from `sources` (operator-edited is visually distinct). A delete
//    action soft-deletes after a confirm; an ai-enrich button fills nulls (disabled once the
//    backend reports 503 `not_available`, i.e. F24.2 not yet deployed).
//  • Team — GET /:id/team, rendering the matchType ladder with an empty-state until F25.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peService } from '@/services/api';
import type { PEHoldingPatch } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Badge, Button, Modal, Spinner, Tabs, TextInput } from '@/components/ui';
import type { ApiError, PEHolding, PEHoldingSource, PETeamMatchType } from '@/types';

const SOURCE_LABEL: Record<PEHoldingSource, string> = {
  operator: 'Edited by you',
  scrape: 'From scrape',
  scrape_unverified: 'From scrape (unverified)',
  ai_search: 'AI-filled',
  ai_description: 'Inferred from description',
};

function ProvenanceBadge({ source }: { source: PEHoldingSource | undefined }) {
  if (!source) return null;
  // Operator edits are the "trusted" provenance — surface them distinctly (success tone).
  const tone = source === 'operator' ? 'success' : source === 'ai_search' ? 'info' : 'secondary';
  return (
    <Badge tone={tone} className="ms-2">
      {SOURCE_LABEL[source]}
    </Badge>
  );
}

const TEAM_MATCH_COPY: Record<PETeamMatchType, string> = {
  direct: 'People matched directly to this company.',
  sector_fallback: 'No direct people — showing the firm’s team for this sector.',
  firm_fallback: 'No direct or sector people — showing the firm’s senior investment lead.',
  // F66: was "people land with F25" — F25 shipped long ago, so that read as a broken promise.
  none: 'No people scraped for this firm yet.',
};

function TeamPanel({ holdingId }: { holdingId: string }) {
  const teamQuery = useQuery({
    queryKey: ['pe', 'holding', holdingId, 'team'],
    queryFn: () => peService.getHoldingTeam(holdingId),
  });

  if (teamQuery.isPending) return <Spinner />;
  if (teamQuery.isError || !teamQuery.data) {
    return <p className="text-muted">Could not load the team.</p>;
  }

  const team = teamQuery.data;

  return (
    <div>
      <p className="text-muted small mb-2" data-testid="team-match-type">
        {TEAM_MATCH_COPY[team.matchType]}
      </p>
      {team.matchType === 'none' || team.people.length === 0 ? (
        <p className="text-muted">No people to show yet.</p>
      ) : (
        <ul className="list-group">
          {team.people.map((p) => (
            <li
              key={p.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>
                <span className="fw-semibold">{p.name}</span>
                {p.title && <span className="text-muted"> — {p.title}</span>}
              </span>
              <Badge tone={p.matchType === 'direct' ? 'success' : 'secondary'}>{p.matchType}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface HoldingEditDrawerProps {
  holding: PEHolding | null;
  open: boolean;
  onClose: () => void;
}

export default function HoldingEditDrawer({ holding, open, onClose }: HoldingEditDrawerProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('edit');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [geography, setGeography] = useState('');
  const [investmentDate, setInvestmentDate] = useState('');
  const [nameError, setNameError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [enrichUnavailable, setEnrichUnavailable] = useState(false);
  const [filledFields, setFilledFields] = useState<string[] | null>(null);

  // Reset the form whenever a new holding is opened.
  useEffect(() => {
    if (holding) {
      setCompanyName(holding.companyName ?? '');
      setSector(holding.sector ?? '');
      setGeography(holding.geography ?? '');
      setInvestmentDate(holding.investmentDate ?? '');
      setNameError(false);
      setConfirmDelete(false);
      setFilledFields(null);
      setTab('edit');
    }
  }, [holding]);

  const invalidateList = () => void queryClient.invalidateQueries({ queryKey: ['pe', 'holdings'] });

  const updateMutation = useMutation({
    mutationFn: (patch: PEHoldingPatch) => peService.updateHolding(holding!.id, patch),
    onSuccess: () => {
      toast.success('Holding updated.');
      invalidateList();
      onClose();
    },
    onError: () => toast.error('Update failed.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => peService.deleteHolding(holding!.id),
    onSuccess: () => {
      toast.success('Holding deleted.');
      invalidateList();
      onClose();
    },
    onError: () => toast.error('Delete failed.'),
  });

  const enrichMutation = useMutation({
    mutationFn: () => peService.aiEnrichHolding(holding!.id),
    onSuccess: (result) => {
      setFilledFields(result.filledFields);
      toast.success(
        result.filledFields.length
          ? `AI filled: ${result.filledFields.join(', ')}.`
          : 'AI enrichment found nothing to fill.',
      );
      invalidateList();
    },
    onError: (error: ApiError) => {
      // F24.2 not yet deployed → the backend returns 503 not_available; disable the control.
      if (error.status === 503) {
        setEnrichUnavailable(true);
        toast.error('AI enrichment is not available yet.');
      } else {
        toast.error('AI enrichment failed.');
      }
    },
  });

  if (!holding) return null;

  const handleSave = () => {
    const name = companyName.trim();
    if (!name) {
      setNameError(true);
      return;
    }
    setNameError(false);

    const patch: PEHoldingPatch = {};
    if (name !== (holding.companyName ?? '')) patch.companyName = name;
    if (sector.trim() !== (holding.sector ?? '')) patch.sector = sector.trim() || null;
    if (geography.trim() !== (holding.geography ?? '')) patch.geography = geography.trim() || null;
    if (investmentDate.trim() !== (holding.investmentDate ?? ''))
      patch.investmentDate = investmentDate.trim() || null;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    updateMutation.mutate(patch);
  };

  const tabs = [
    { id: 'edit', label: 'Edit' },
    { id: 'team', label: 'Team' },
  ];

  return (
    <Modal open={open} onClose={onClose} title={holding.companyName} size="lg">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'edit' && (
        <div className="mt-3">
          <div className="mb-3">
            <div className="d-flex align-items-center">
              <label className="form-label mb-0" htmlFor="holding-company">
                Company name
              </label>
              <ProvenanceBadge source={holding.sources.companyName} />
            </div>
            <TextInput
              id="holding-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              error={nameError ? 'Company name is required.' : undefined}
            />
          </div>

          <div className="mb-3">
            <div className="d-flex align-items-center">
              <label className="form-label mb-0" htmlFor="holding-sector">
                Sector
              </label>
              <ProvenanceBadge source={holding.sources.sector} />
            </div>
            <TextInput
              id="holding-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="e.g. Healthcare IT"
            />
          </div>

          <div className="mb-3">
            <div className="d-flex align-items-center">
              <label className="form-label mb-0" htmlFor="holding-geo">
                Geography
              </label>
              <ProvenanceBadge source={holding.sources.geography} />
            </div>
            <TextInput
              id="holding-geo"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              placeholder="e.g. North America"
            />
          </div>

          <div className="mb-3">
            <div className="d-flex align-items-center">
              <label className="form-label mb-0" htmlFor="holding-date">
                Investment date
              </label>
              <ProvenanceBadge source={holding.sources.investmentDate} />
            </div>
            <TextInput
              id="holding-date"
              value={investmentDate}
              onChange={(e) => setInvestmentDate(e.target.value)}
              placeholder="e.g. 2021 or Mar 2021"
            />
          </div>

          {filledFields && (
            <p className="text-success small" role="status">
              {filledFields.length
                ? `AI filled: ${filledFields.join(', ')}.`
                : 'AI enrichment found nothing to fill.'}
            </p>
          )}

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex gap-2">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                variant="popup-secondary"
                onClick={() => enrichMutation.mutate()}
                disabled={enrichMutation.isPending || enrichUnavailable}
                title={enrichUnavailable ? 'AI enrichment is not available yet.' : undefined}
              >
                {enrichMutation.isPending ? 'Enriching…' : 'AI enrich'}
              </Button>
            </div>
            {confirmDelete ? (
              <div className="d-flex gap-2 align-items-center">
                <span className="small">Delete this holding?</span>
                <Button
                  variant="popup-secondary"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  Confirm delete
                </Button>
                <Button variant="popup-secondary" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="popup-secondary" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="mt-3">
          <TeamPanel holdingId={holding.id} />
        </div>
      )}
    </Modal>
  );
}
