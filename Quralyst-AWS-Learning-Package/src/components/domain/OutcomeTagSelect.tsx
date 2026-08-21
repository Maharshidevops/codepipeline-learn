// OutcomeTagSelect (Tier A / A5) — per-company outcome dropdown for a result row. Setting a
// terminal outcome (won/lost/dead) feeds the AI's scoring memory. Selecting "Not contacted"
// clears any manual tag. Self-contained: drop into a result-table row.
import { useState } from 'react';
import {
  outcomesService,
  OUTCOME_LABELS,
  type OutcomeValue,
  type ResultKind,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';

// Reference-parity ladder: the NDA / LOI / due-diligence rungs are folded into 'in_progress'.
// Those states come from the deal pipeline and inline CRM, which the backend reads directly.
const ORDER: OutcomeValue[] = [
  'not_contacted',
  'contacted',
  'responded',
  'in_progress',
  'closed_won',
  'closed_lost',
  'dead',
];

interface Props {
  resultId: string;
  firmKey: string;
  companyName: string;
  value: OutcomeValue;
  resultKind?: ResultKind;
  onChange?: (next: OutcomeValue) => void;
}

export default function OutcomeTagSelect({
  resultId,
  firmKey,
  companyName,
  value,
  resultKind = 'processed',
  onChange,
}: Props) {
  const toast = useToast();
  const [current, setCurrent] = useState<OutcomeValue>(value);
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: OutcomeValue) => {
    const prev = current;
    setCurrent(next);
    setSaving(true);
    try {
      if (next === 'not_contacted') {
        // Clearing the manual tag; ignore a 404 (nothing was set).
        await outcomesService.clear(resultId, firmKey).catch(() => {});
      } else {
        await outcomesService.set(resultId, firmKey, {
          outcome: next,
          companyName,
          resultKind,
        });
      }
      onChange?.(next);
    } catch (err) {
      setCurrent(prev); // revert on failure — never show a state that didn't persist
      toast.error((err as { message?: string })?.message ?? 'Failed to save outcome.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      className="form-select form-select-sm"
      aria-label={`Outcome for ${companyName}`}
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as OutcomeValue)}
    >
      {ORDER.map((o) => (
        <option key={o} value={o}>
          {OUTCOME_LABELS[o]}
        </option>
      ))}
    </select>
  );
}
