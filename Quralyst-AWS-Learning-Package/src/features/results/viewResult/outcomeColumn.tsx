// Leading table column for per-row outcome tagging (Tier A / A5): renders the OutcomeTagSelect
// dropdown for each company. Terminal outcomes (Won/Lost/Dead) feed the AI's scoring memory.
// Same column-factory pattern as commentsColumn.
import type { Column } from '@/components/ui';
import OutcomeTagSelect from '@/components/domain/OutcomeTagSelect';
import { normalizeFirmKey } from '@/services/api';
import type { ResolvedOutcome } from '@/services/api';

type RowData = Record<string, string>;

export function outcomeColumn(
  nameCol: string,
  resultId: string,
  outcomes: Record<string, ResolvedOutcome>,
  onSaved: () => void,
): Column<RowData> {
  return {
    key: '__outcome',
    header: 'Outcome',
    width: 150,
    render: (row) => {
      const companyName = row[nameCol] ?? '';
      const firmKey = normalizeFirmKey(companyName);
      if (!firmKey) return null;
      const resolved = outcomes[firmKey];
      return (
        <OutcomeTagSelect
          // Re-mount when the server-resolved value changes so local state stays in sync.
          key={`${firmKey}:${resolved?.resolved_outcome ?? 'not_contacted'}`}
          resultId={resultId}
          firmKey={firmKey}
          companyName={companyName}
          value={resolved?.resolved_outcome ?? 'not_contacted'}
          onChange={onSaved}
        />
      );
    },
  };
}
