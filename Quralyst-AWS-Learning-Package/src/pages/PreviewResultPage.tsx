// PreviewResultPage — port of Backup/templates/quralyst_research/preview_result.html.
// Loads the result detail (resultsService.get) and renders the breadcrumb + header + a DataTable
// built from the result's columns/rows. Expandable cells open the shared CellModal.
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DataTable, Spinner } from '@/components/ui';
import type { Column } from '@/components/ui';
import QueryError from '@/components/feedback/QueryError';
import { resultsService } from '@/services/api';
import type { ResultDetail } from '@/types';
import { formatDateTimeLong } from '@/lib/datetime';
import CommentModal from '@/features/results/viewResult/CommentModal';
import { commentsColumn } from '@/features/results/viewResult/commentsColumn';
import { useCommentCounts } from '@/features/results/viewResult/useCommentCounts';
import '@/styles/pages/preview-result.css';

type RowData = Record<string, string>;

export default function PreviewResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId');
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Read-only comments (Phase 29): viewable on the preview, editor controls hidden
  // (legacy "comment viewing only" behavior).
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const commentCounts = useCommentCounts(resultId);

  useEffect(() => {
    if (!resultId) return;
    let active = true;
    setLoading(true);
    setError(false);
    const load = fileId
      ? resultsService.getInputFilePreview(resultId, fileId)
      : resultsService.get(resultId);
    load
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [resultId, fileId, reloadKey]);

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <QueryError onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (!result) {
    return (
      <div className="preview-no-data text-center text-muted py-5">
        <i className="bi bi-table" />
        <h5 className="mt-3">No Data Available</h5>
        <p>The data could not be loaded or is empty.</p>
      </div>
    );
  }

  const isInputFilePreview = Boolean(result.isInputFilePreview);
  const resultsCount = result.rows.length;
  const columnsCount = result.columns.length;

  const columns: Column<RowData>[] = result.columns.map((col) => ({
    key: col,
    header: col,
    expandable: true,
  }));

  // Comments only apply to result rows (not input-file previews) and need a company column.
  const nameCol = result.columns.find((c) => c.trim().toLowerCase().includes('company name'));
  if (!isInputFilePreview && nameCol) {
    columns.unshift(commentsColumn(nameCol, commentCounts, setCommentTarget));
  }

  return (
    <>
      {isInputFilePreview && (
        <div className="mb-4">
          <h2 className="preview-page-title">
            <i className="bi bi-file-earmark-spreadsheet me-2" />
            Preview: Input File - {result.inputFileName || result.processId}
          </h2>
          <div className="preview-page-subtitle">
            <p className="mb-0">
              <span className="text-muted">Created on </span>
              <span className="creation-date">{formatDateTimeLong(result.createdAt)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Data Table Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <h5 className="table-title mb-0">
          <span className="badge ms-2">{resultsCount} rows</span>
          <span className="badge ms-2">{columnsCount} columns</span>
        </h5>
      </div>

      {/* Data Table — plain shell; DataTable's own .table-responsive is the single scroll container
          (wrapping it in another .table-responsive/.table-container gave two nested scrollbars). */}
      <div id="results-table">
        <DataTable<RowData>
          columns={columns}
          rows={result.rows}
          emptyMessage="The data could not be loaded or is empty."
        />
      </div>

      {resultId && (
        <CommentModal
          resultId={resultId}
          companyName={commentTarget}
          onClose={() => setCommentTarget(null)}
          readOnly
        />
      )}
    </>
  );
}
