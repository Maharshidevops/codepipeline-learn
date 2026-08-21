// Add-to-deal (Tier B / B1 / F18) — bulk-add the companies from a research result into a deal.
// Pairs with F19's list linking; here it's the chunked bulk-add entry point on result pages.
import { useState } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { dealsService, type Deal } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export interface AddToDealRecord {
  companyName: string;
  website?: string;
  predictedFit?: string;
  /** Where the row came from (Apollo/LinkedIn/File …) — used to auto-tag Buyer Type. */
  source?: string;
  /** Primary contact carried over from the enriched result row (blank if the row had none). */
  contactName?: string;
  contactEmail?: string;
  contactTitle?: string;
  contactPhone?: string;
}

export default function AddToDealButton({
  records,
  sourceResultId,
  className,
  icon,
  label,
  style,
}: {
  records: AddToDealRecord[];
  /** The result these rows came from. Threaded to the backend as the run link so tier and buyer
   *  type auto-seed from the row's predicted fit — without it both land blank in the buyer log. */
  sourceResultId?: string;
  className?: string;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealId, setDealId] = useState('');
  const [busy, setBusy] = useState(false);

  const openModal = async () => {
    setOpen(true);
    try {
      const d = await dealsService.list('active');
      setDeals(d);
      if (d.length) setDealId(d[0].id);
    } catch {
      toast.error('Could not load your deals.');
    }
  };

  const add = async () => {
    if (!dealId) {
      toast.error('Pick a deal first.');
      return;
    }
    setBusy(true);
    try {
      const rows = records
        .filter((r) => r.companyName?.trim())
        .map((r) => {
          const name = (r.contactName ?? '').trim();
          const email = (r.contactEmail ?? '').trim();
          // Only attach a primary contact when the row actually had one.
          const contacts =
            name || email
              ? [
                  {
                    name,
                    email,
                    title: (r.contactTitle ?? '').trim(),
                    phone: (r.contactPhone ?? '').trim(),
                    isPrimary: true,
                    outreachStatus: 'not_contacted',
                  },
                ]
              : undefined;
          return {
            companyName: r.companyName,
            website: r.website ?? '',
            predictedFit: r.predictedFit ?? '',
            sourceDataset: r.source ?? '',
            sourceResultId: sourceResultId ?? '',
            contacts,
          };
        });
      const res = await dealsService.bulkAdd(dealId, rows);
      toast.success(
        `Added ${res.added} companies${res.skipped.length ? `, skipped ${res.skipped.length}` : ''}.`,
      );
      setOpen(false);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not add to deal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className || 'btn btn-standard btn-sm'}
        style={style}
        onClick={openModal}
        title="Add these companies to a deal pipeline"
      >
        {icon !== undefined ? icon : <i className="bi bi-briefcase me-1" aria-hidden="true" />}
        {label !== undefined ? label : 'Add to deal'}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add companies to a deal" size="md">
        {deals.length === 0 ? (
          <p className="text-muted mb-0">
            You have no active deals. Create one from the Deals page first.
          </p>
        ) : (
          <>
            <p className="text-muted small">
              Adds {records.filter((r) => r.companyName?.trim()).length} companies to the chosen
              deal&apos;s pipeline (duplicates are skipped).
            </p>
            <label className="form-label fw-semibold" htmlFor="add-deal-select">
              Deal
            </label>
            <select
              id="add-deal-select"
              className="form-select mb-3"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
            >
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-standard"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-standard" onClick={add} disabled={busy}>
                {busy ? <Spinner size="sm" /> : null} Add to deal
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
