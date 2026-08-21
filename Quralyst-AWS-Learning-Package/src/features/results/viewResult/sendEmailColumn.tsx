// Trailing "Send Email" column for rows with a Contact Email. Opens the draft modal.
import type { Column } from '@/components/ui';
import './send-email-column.css';

type RowData = Record<string, string>;

function findEmailColumn(columns: string[]): string | null {
  const exact = columns.find((c) => c.trim().toLowerCase() === 'contact email');
  if (exact) return exact;
  return (
    columns.find((c) => {
      const n = c.trim().toLowerCase();
      return n === 'email' || n === 'email address';
    }) ?? null
  );
}

export function sendEmailColumn(
  columns: string[],
  nameCol: string,
  onOpen: (companyName: string, recipientEmail: string) => void,
): Column<RowData> | null {
  const emailCol = findEmailColumn(columns);
  if (!emailCol) return null;

  return {
    key: '__send_email',
    header: 'Send Email',
    // Wider than the button so there is breathing room before the table scrollbar.
    width: 160,
    render: (row) => {
      const companyName = (row[nameCol] ?? '').trim();
      const recipientEmail = (row[emailCol] ?? '').trim();
      const hasRecipient = recipientEmail.includes('@');
      if (!hasRecipient) {
        return <span className="text-muted send-email-cell">No Email</span>;
      }
      return (
        <div className="send-email-cell">
          <button
            type="button"
            className="btn btn-standard btn-sm action-btn"
            onClick={() => onOpen(companyName, recipientEmail)}
          >
            Send Email
          </button>
        </div>
      );
    },
  };
}
