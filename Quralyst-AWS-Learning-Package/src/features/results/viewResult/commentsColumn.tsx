// Leading table column for per-row comments (Phase 29): chat icon button with a count badge;
// opens the CommentModal for that company. Shared by the Data tab (editable) and the Preview
// tab (read-only).
import type { Column } from '@/components/ui';
import './comment-modal.css';

type RowData = Record<string, string>;

export function commentsColumn(
  nameCol: string,
  counts: Record<string, number>,
  onOpen: (companyName: string) => void,
): Column<RowData> {
  return {
    key: '__comments',
    header: 'Comments',
    width: 90,
    render: (row) => {
      const companyName = row[nameCol] ?? '';
      const count = counts[companyName] ?? 0;
      return (
        <button
          type="button"
          className="btn-unstyled comment-row-btn"
          title={count ? `${count} comment${count > 1 ? 's' : ''}` : 'Add a comment'}
          aria-label={`Comments for ${companyName}`}
          onClick={() => onOpen(companyName)}
        >
          <i className={`bi ${count ? 'bi-chat-text-fill' : 'bi-chat'}`} />
          {count > 0 && <span className="comment-indicator">{count}</span>}
        </button>
      );
    },
  };
}
