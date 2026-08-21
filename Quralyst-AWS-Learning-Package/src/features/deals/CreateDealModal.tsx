// Create Deal modal — QURALYST-20 parity (name, description, type toggle, optional brief).
import { useRef, useState } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { dealsService, mandateService, type DealType } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import '@/styles/pages/deals.css';

const BRIEF_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.rtf,.csv,.xlsx,.xls';
const BRIEF_MAX_BYTES = 8 * 1024 * 1024;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (dealId: string) => void;
}

export default function CreateDealModal({ open, onClose, onCreated }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dealType, setDealType] = useState<DealType>('sell_side');
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [briefBusy, setBriefBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setDealType('sell_side');
    setBriefFile(null);
    setError('');
    setCreating(false);
    setBriefBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    if (creating) return;
    reset();
    onClose();
  };

  const pickBrief = (file: File | null) => {
    setError('');
    if (file && file.size > BRIEF_MAX_BYTES) {
      setError('Brief must be 8 MB or smaller.');
      return;
    }
    setBriefFile(file);
  };

  const createDeal = async () => {
    if (!name.trim()) {
      setError('Enter a deal name.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const deal = await dealsService.create({
        name: name.trim(),
        dealType,
        description: description.trim() || undefined,
      });
      if (briefFile) {
        setBriefBusy(true);
        try {
          await dealsService.uploadBrief(deal.id, briefFile);
          try {
            const prefill = await mandateService.parseMandate({
              files: [briefFile],
              intent: 'example-target-profile',
            });
            await dealsService.setBriefCriteria(deal.id, {
              criteria: prefill as unknown as Record<string, unknown>,
              status: 'ready',
            });
            toast.success('Deal created. Brief uploaded and parsed.');
          } catch {
            await dealsService.setBriefCriteria(deal.id, {
              status: 'error',
              errorMessage:
                'Could not parse the brief. You can still download it and enter criteria manually.',
            });
            toast.error('Deal created and brief stored, but parsing failed.');
          }
        } catch {
          toast.error(
            'Deal created, but brief upload failed. You can attach it in Research Lists.',
          );
        } finally {
          setBriefBusy(false);
        }
      } else {
        toast.success('Deal created.');
      }
      reset();
      onCreated(deal.id);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not create deal.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create New Deal" size="md">
      {error && (
        <p className="small text-danger bg-danger-subtle rounded px-3 py-2 mb-3" role="alert">
          {error}
        </p>
      )}

      <label className="form-label fw-semibold" htmlFor="deal-name">
        Deal Name <span className="text-danger">*</span>
      </label>
      <input
        id="deal-name"
        className="form-control mb-3"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Project Meridian"
        disabled={creating}
      />

      <label className="form-label fw-semibold" htmlFor="deal-desc">
        Client Firm Name <span className="text-muted fw-normal">(optional)</span>
      </label>
      <input
        id="deal-desc"
        className="form-control mb-3"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. Apex Partners"
        disabled={creating}
      />

      <div className="form-label fw-semibold">Deal Type *</div>
      <div className="deal-type-toggle mb-3" role="group" aria-label="Deal type">
        {(['sell_side', 'buy_side'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`deal-type-toggle__btn${dealType === t ? ' is-active' : ''}`}
            onClick={() => setDealType(t)}
            disabled={creating}
            aria-pressed={dealType === t}
          >
            {t === 'sell_side' ? 'Sell-Side' : 'Buy-Side'}
          </button>
        ))}
      </div>

      <div className="form-label fw-semibold mb-1">
        Deal brief <span className="text-muted fw-normal">(optional)</span>
      </div>
      <p className="small text-muted mb-2">
        Attach a CIM, mandate, or buy-box document. Criteria are extracted automatically after
        create.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept={BRIEF_ACCEPT}
        className="d-none"
        onChange={(e) => pickBrief(e.target.files?.[0] ?? null)}
      />
      {briefFile ? (
        <div className="d-flex align-items-center gap-2 border rounded px-3 py-2 mb-3">
          <i className="bi bi-file-earmark-text text-primary" aria-hidden="true" />
          <span className="small text-truncate flex-grow-1">{briefFile.name}</span>
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-muted"
            onClick={() => pickBrief(null)}
            disabled={creating}
            aria-label="Remove brief"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="deal-btn deal-btn--outline deal-btn--sm mb-3"
          onClick={() => fileRef.current?.click()}
          disabled={creating}
        >
          <i className="bi bi-file-earmark-text" aria-hidden="true" /> Choose file
        </button>
      )}

      <p className="text-muted small">
        Default pipeline stages are created automatically for the chosen type.
      </p>

      <div className="d-flex justify-content-end gap-2 mt-2">
        <button
          type="button"
          className="deal-btn deal-btn--ghost"
          onClick={handleClose}
          disabled={creating}
        >
          Cancel
        </button>
        <button
          type="button"
          className="deal-btn"
          onClick={createDeal}
          disabled={creating || !name.trim()}
        >
          {creating ? <Spinner size="sm" /> : null}{' '}
          {briefBusy ? 'Parsing brief…' : creating ? 'Creating…' : 'Create Deal'}
        </button>
      </div>
    </Modal>
  );
}
