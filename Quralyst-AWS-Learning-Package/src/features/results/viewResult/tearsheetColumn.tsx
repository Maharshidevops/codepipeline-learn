// Trailing tearsheet action for company rows on result tables.
import type { Column } from '@/components/ui';
import { openTearsheet } from '@/lib/tearsheet/openTearsheet';

type RowData = Record<string, string>;

function findWebsiteColumn(columns: string[]): string | null {
  const exact = columns.find((c) => c.trim().toLowerCase() === 'website');
  if (exact) return exact;
  return (
    columns.find((c) => {
      const n = c.trim().toLowerCase();
      return n === 'url' || n === 'company website' || n === 'website url';
    }) ?? null
  );
}

/** Column that opens the PE tearsheet for the row's company. */
export function tearsheetColumn(
  columns: string[],
  nameCol: string,
  onOpen: (path: string) => void,
): Column<RowData> {
  const websiteCol = findWebsiteColumn(columns);

  return {
    key: '__tearsheet',
    header: 'Tearsheet',
    width: 120,
    render: (row) => {
      const companyName = (row[nameCol] ?? '').trim();
      if (!companyName) return <span className="text-muted">—</span>;
      const website = websiteCol ? (row[websiteCol] ?? '').trim() : '';
      const path = openTearsheet(companyName, website || undefined);
      return (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title={`Open tearsheet for ${companyName}`}
          onClick={() => onOpen(path)}
        >
          <i className="bi bi-file-earmark-text me-1" aria-hidden />
          Open
        </button>
      );
    },
  };
}
