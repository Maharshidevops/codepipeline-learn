// IB Vertical — add-bank dialog (CU.5).
// Replit InvestmentBanks Add Bank dialog: Name / Website URL / Description.
// Optional Discover section (Serper) kept collapsed so the default UI matches Replit.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button, Modal, TextInput } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { ibService } from '@/services/api';
import type { IBDiscoverResult } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  websiteUrl: z.string().min(1, 'Website URL is required').url('Enter a full URL (https://…)'),
  description: z.string(),
});
type AddBankValues = z.infer<typeof schema>;

export interface IBAddBankModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function IBAddBankModal({ open, onClose, onCreated }: IBAddBankModalProps) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IBDiscoverResult[] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddBankValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', websiteUrl: '', description: '' },
  });

  const close = () => {
    reset();
    setQuery('');
    setResults(null);
    onClose();
  };

  const discover = useMutation({
    mutationFn: (q: string) => ibService.discoverBanks(q),
    onSuccess: (rows) => setResults(rows),
    onError: () => toast.error('Discovery failed (is a Serper API key configured?).'),
  });

  const create = useMutation({
    mutationFn: (values: AddBankValues) =>
      ibService.createBank({
        name: values.name.trim(),
        websiteUrl: values.websiteUrl.trim(),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
      }),
    onSuccess: (bank) => {
      toast.success(`Bank “${bank.name}” created; first scrape queued.`);
      onCreated();
      close();
    },
    onError: () => toast.error('Could not create the bank (is the website already tracked?).'),
  });

  const applyCandidate = (c: IBDiscoverResult) => {
    setValue('name', c.name ?? '', { shouldValidate: true });
    setValue('websiteUrl', c.websiteUrl, { shouldValidate: true });
  };

  return (
    <Modal open={open} onClose={close} title="Add Investment Bank" size="md">
      <p className="text-muted small mb-3">
        Add an investment bank to begin tracking their deals and professionals.
      </p>

      <form onSubmit={handleSubmit((values) => create.mutate(values))} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="ib-add-name">
            Name
          </label>
          <input
            id="ib-add-name"
            type="text"
            className="form-control"
            placeholder="Houlihan Lokey"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'ib-add-name-error' : undefined}
            {...register('name')}
          />
          {errors.name && (
            <div id="ib-add-name-error" className="text-danger small mt-1" role="alert">
              {errors.name.message}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="ib-add-website">
            Website URL
          </label>
          <input
            id="ib-add-website"
            type="url"
            className="form-control"
            placeholder="https://houlihanlockey.com"
            aria-invalid={!!errors.websiteUrl}
            aria-describedby={errors.websiteUrl ? 'ib-add-website-error' : undefined}
            {...register('websiteUrl')}
          />
          {errors.websiteUrl && (
            <div id="ib-add-website-error" className="text-danger small mt-1" role="alert">
              {errors.websiteUrl.message}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="ib-add-description">
            Description (Optional)
          </label>
          <textarea
            id="ib-add-description"
            className="form-control"
            rows={3}
            placeholder="Notes about the bank…"
            {...register('description')}
          />
        </div>

        <div className="d-flex gap-2 justify-content-end mb-3">
          <Button variant="popup-secondary" type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={create.isPending}
            loading={create.isPending}
            data-testid="ib-add-submit"
          >
            {create.isPending ? 'Adding…' : 'Add Bank'}
          </Button>
        </div>
      </form>

      {/* Optional Serper discover (CU.5) — below the Replit-matching form */}
      <hr className="my-3" />
      <section aria-labelledby="ib-discover-heading">
        <h2 id="ib-discover-heading" className="h6">
          Or discover a bank
        </h2>
        <div className="d-flex gap-2 align-items-end">
          <div className="flex-grow-1">
            <TextInput
              id="ib-discover-query"
              label="Search query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="middle market M&A"
            />
          </div>
          <Button
            variant="popup-secondary"
            disabled={discover.isPending}
            loading={discover.isPending}
            onClick={() => discover.mutate(query || 'middle market M&A')}
            data-testid="ib-discover-search"
          >
            Search
          </Button>
        </div>
        {results && (
          <ul className="list-group mt-2" data-testid="ib-discover-results">
            {results.length === 0 && (
              <li className="list-group-item text-muted">No candidates found.</li>
            )}
            {results.map((r) => (
              <li
                key={r.websiteUrl}
                className="list-group-item d-flex justify-content-between align-items-center gap-2"
              >
                <span className="text-truncate">
                  <span className="fw-medium">{r.name ?? r.websiteUrl}</span>
                  {r.snippet && <span className="text-muted small d-block">{r.snippet}</span>}
                </span>
                <Button variant="popup-secondary" onClick={() => applyCandidate(r)}>
                  Use
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}
