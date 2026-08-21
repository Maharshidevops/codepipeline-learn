// InputFilesUsed — the "Input Files Used" table, split out of FilesProcessingSummary into its own
// standalone card (it is conceptually separate from the processing-summary stats/filters). Driven by
// ResultSummary.filesUploaded; per-file stats come from the API when available.
import type { ResultSummary } from '@/types';
import { paths } from '@/routes/paths';
import { Link } from 'react-router-dom';
import { resultsService } from '@/services/api';
import { useToast } from '@/hooks/useToast';

type UploadedFile = NonNullable<ResultSummary['filesUploaded']>[number];

interface InputFilesUsedProps {
  files: UploadedFile[];
  resultId: string;
  /** Match the Replit result-detail table (rd-table) instead of the legacy blue-header table. */
  variant?: 'legacy' | 'detail';
}

function formatRecords(count: number | undefined): string {
  if (count == null || count <= 0) return 'N/A';
  return count.toLocaleString();
}

function statusLabel(file: UploadedFile): { text: string; className: string; title?: string } {
  if (file.validationFailed) {
    return {
      text: 'Validation Failed',
      className: 'rd-fitpill rd-fitpill--no',
      title: file.validationReason || 'Validation failed',
    };
  }
  if (file.error) {
    return { text: 'Error', className: 'rd-fitpill rd-fitpill--no' };
  }
  return { text: 'Success', className: 'rd-fitpill rd-fitpill--fit' };
}

export default function InputFilesUsed({
  files,
  resultId,
  variant = 'legacy',
}: InputFilesUsedProps) {
  const toast = useToast();

  if (files.length === 0) return null;

  const handleDownload = (fileId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    toast.info('Preparing your download…');
    const a = document.createElement('a');
    a.href = resultsService.downloadInputFileUrl(resultId, fileId);
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
    e.currentTarget.blur();
  };

  if (variant === 'detail') {
    return (
      <div className="rd-input-files mb-3">
        <h4 className="rd-run-section-title mb-3">
          <i className="bi bi-files me-2" aria-hidden="true" />
          Input Files Used
        </h4>
        <div className="rd-table-wrap">
          <table className="rd-table rd-input-files-table">
            <thead>
              <tr>
                <th>Input File Name</th>
                <th>Records Processed</th>
                <th>Matches</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => {
                const fileId = file.gridfsId ?? null;
                const status = statusLabel(file);
                return (
                  <tr className="rd-input-files-row" key={(fileId ?? file.fileName) + i}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-file-earmark-excel text-success" aria-hidden="true" />
                        <span className="rd-input-files__name">
                          {i + 1}. {file.displayFilename || file.fileName}
                        </span>
                      </div>
                    </td>
                    <td>{formatRecords(file.totalFileRecords)}</td>
                    <td>{file.matchesFound ?? 0}</td>
                    <td>
                      <span className={status.className} title={status.title}>
                        {status.text}
                      </span>
                      {file.validationReason && (
                        <div className="rd-input-files__reason">{file.validationReason}</div>
                      )}
                    </td>
                    <td>
                      {fileId ? (
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <Link
                            to={paths.previewInputFile(resultId, fileId)}
                            className="btn btn-sm border bg-white text-dark"
                            data-action="preview-input"
                          >
                            <i className="bi bi-eye me-1" aria-hidden="true" />
                            Preview
                          </Link>
                          <button
                            type="button"
                            className="btn btn-sm rd-btn-primary"
                            data-action="download-input"
                            onClick={(e) => handleDownload(fileId, e)}
                          >
                            <i className="bi bi-download me-1" aria-hidden="true" />
                            Download
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">Unavailable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="input-files-section mb-4">
      <h4 className="input-files-title mb-3">
        <i className="bi bi-files me-2" />
        Input Files Used
      </h4>
      <div className="table-responsive">
        <table className="table view-result-table" id="inputFileTable">
          <thead>
            <tr>
              <th className="view-result-filename-col">Input File Name</th>
              <th className="text-center">Records Processed</th>
              <th className="text-center">Matches</th>
              <th className="text-center">Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, i) => {
              const fileId = file.gridfsId ?? null;
              const hasActions = Boolean(fileId);
              return (
                <tr key={(fileId ?? file.fileName) + i}>
                  <td className="view-result-filename-cell">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-file-earmark-excel text-success me-2" />
                      <div>
                        <div className="fw-semibold">
                          {i + 1}. {file.displayFilename || file.fileName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="text-dark">{formatRecords(file.totalFileRecords)}</span>
                  </td>
                  <td className="text-center">
                    <span className="text-dark">{file.matchesFound ?? 0}</span>
                  </td>
                  <td className="text-center">
                    {file.validationFailed ? (
                      <span
                        className="badge bg-danger"
                        title={file.validationReason || 'Validation failed'}
                      >
                        Validation Failed
                      </span>
                    ) : file.error ? (
                      <span className="badge bg-dark">Error</span>
                    ) : (
                      <span className="badge bg-dark">Success</span>
                    )}
                    {file.validationReason && (
                      <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                        {file.validationReason}
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="btn-group btn-group-sm">
                      {hasActions ? (
                        <>
                          <Link
                            to={paths.previewInputFile(resultId, fileId!)}
                            className="btn btn-standard btn-sm rounded-pill me-1 action-btn"
                            data-action="preview-input"
                          >
                            <i className="bi bi-eye me-1" />
                            Preview
                          </Link>
                          <button
                            type="button"
                            className="btn btn-standard btn-sm rounded-pill action-btn"
                            data-action="download-input"
                            onClick={(e) => handleDownload(fileId!, e)}
                          >
                            <i className="bi bi-download me-1" />
                            Download
                          </button>
                        </>
                      ) : (
                        <span className="text-muted small">Unavailable</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
