// Pagination — single React renderer replacing the Jinja render_pagination macro + its JS twin.
// Uses .pagination-section > .pagination markup (pagination.css, pill style). Windowed page list
// with ellipses + Previous/Next; disabled/active states match .page-item.disabled/.active.
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function buildPages(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = buildPages(page, totalPages);

  const go = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };

  return (
    <nav className="pagination-section" aria-label="Pagination">
      <ul className="pagination">
        <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => go(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
        </li>
        {pages.map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} className="page-item disabled">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li key={p} className={`page-item${p === page ? ' active' : ''}`}>
              <button type="button" className="page-link" onClick={() => go(p)}>
                {p}
              </button>
            </li>
          ),
        )}
        <li className={`page-item${page === totalPages ? ' disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => go(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
