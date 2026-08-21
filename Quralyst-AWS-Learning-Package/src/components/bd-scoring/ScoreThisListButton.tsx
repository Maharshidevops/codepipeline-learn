// "Score this list" entry point (F36.3) — bulk-from-rows then open BD Scoring.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { bdScoringService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/lib/authErrors';
import { paths } from '@/routes/paths';

interface ScoreThisListButtonProps {
  rows: Record<string, unknown>[];
  className?: string;
}

export default function ScoreThisListButton({ rows, className }: ScoreThisListButtonProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!rows.length) {
      toast.error('No rows to score.');
      return;
    }
    setBusy(true);
    try {
      const { templates } = await bdScoringService.listTemplates();
      const template = templates.find((t) => t.isDefault) || templates[0];
      if (!template) {
        toast.error('No scoring templates available.');
        return;
      }
      const normalized = rows.map((r) => ({
        company_name: String(r.company_name || r.companyName || r.company || ''),
        ...r,
      }));
      const res = await bdScoringService.bulkFromRows(template.id, normalized);
      toast.success(`Scored list: created ${res.created}, skipped ${res.skipped}`);
      navigate(paths.bdScoring);
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : 'Unable to score list.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="standard"
      className={className}
      loading={busy}
      onClick={() => void onClick()}
      data-testid="score-this-list"
    >
      Score this list
    </Button>
  );
}
