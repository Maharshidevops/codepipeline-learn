// Link-to-deal control (Tier B / B1 / F19) — on a result page, attach THIS list to one of your
// deals (organizing only; it never adds companies — that's AddToDealButton). Also shows which deals
// the list is already linked to, with unlink. Linking is owner-gated server-side (you must own the
// list); a 403 surfaces as a toast.
import { useState } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { dealsService, type Deal, type DealListLink } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export default function DealLinkControl({
  resultId,
  title = '',
  buttonLabel = 'Link to deal',
}: {
  resultId: string;
  title?: string;
  /** Toolbar label; Target List keeps the default. */
  buttonLabel?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [links, setLinks] = useState<DealListLink[]>([]);
  const [dealId, setDealId] = useState('');
  const [busy, setBusy] = useState(false);

  const openModal = async () => {
    setOpen(true);
    setBusy(true);
    try {
      const [d, l] = await Promise.all([
        dealsService.list('active'),
        dealsService.linksForResult(resultId),
      ]);
      setDeals(d);
      setLinks(l);
      if (d.length) setDealId(d[0].id);
    } catch {
      toast.error('Could not load your deals.');
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    if (!dealId) {
      toast.error('Pick a deal first.');
      return;
    }
    setBusy(true);
    try {
      await dealsService.linkList(dealId, { resultId, kind: 'processed', title });
      setLinks(await dealsService.linksForResult(resultId));
      toast.success('List linked to the deal.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not link the list.');
    } finally {
      setBusy(false);
    }
  };

  const unlink = async (link_: DealListLink) => {
    setBusy(true);
    try {
      await dealsService.unlinkList(link_.dealId, resultId);
      setLinks((prev) => prev.filter((l) => l.id !== link_.id));
      toast.success('Unlinked.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not unlink.');
    } finally {
      setBusy(false);
    }
  };

  const dealName = (id: string) => deals.find((d) => d.id === id)?.name ?? id;

  return (
    <>
      <button
        type="button"
        className="btn btn-standard btn-sm"
        onClick={openModal}
        title="Link this list to a deal"
      >
        <i className="bi bi-link-45deg me-1" aria-hidden="true" /> {buttonLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Link this list to a deal" size="md">
        {busy && deals.length === 0 ? (
          <div className="text-center p-3">
            <Spinner />
          </div>
        ) : deals.length === 0 ? (
          <p className="text-muted mb-0">
            You have no active deals. Create one from the Deals page first.
          </p>
        ) : (
          <>
            {links.length > 0 && (
              <div className="mb-3">
                <div className="fw-semibold small mb-1">Already linked to</div>
                <ul className="list-unstyled small mb-0">
                  {links.map((l) => (
                    <li key={l.id} className="d-flex justify-content-between align-items-center">
                      <span>{dealName(l.dealId)}</span>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => unlink(l)}
                        disabled={busy}
                      >
                        Unlink
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label className="form-label fw-semibold" htmlFor="link-deal-select">
              Deal
            </label>
            <select
              id="link-deal-select"
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
                Close
              </button>
              <button type="button" className="btn btn-standard" onClick={link} disabled={busy}>
                {busy ? <Spinner size="sm" /> : null} Link
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
