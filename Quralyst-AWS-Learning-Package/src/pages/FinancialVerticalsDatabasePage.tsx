// FinancialVerticalsDatabasePage (/financial-verticals/database) — React port of
// Backup/templates/financial_verticals/financial_verticals_database.html: an Excel-upload page for
// (re)building the FV database. File Requirements card + drag-drop upload card + progress + result card.
// Frontend-only: the upload posts via researchService (MSW-mocked) and shows a canned success/error.
import { useRef, useState } from 'react';
import { researchService, type FvDatabaseUploadResult } from '@/services/api';
import { normalizeApiError } from '@/lib/normalizeApiError';
import '@/styles/pages/financial-verticals.css';

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPT = '.xlsx,.xls';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const REQUIRED_COLUMNS = [
  'PE firm name',
  'Domain',
  'PE portfolio Co',
  'Geo criteria',
  'Sector/Industry Criteria',
];
const OPTIONAL_COLUMNS = [
  'Financial ranges (revenue, EBITDA, etc.)',
  'Company descriptions',
  'Website URLs',
  'Industry classifications',
  'Investment status',
];

type Result =
  | { kind: 'success'; res: FvDatabaseUploadResult; fileName: string }
  | { kind: 'error'; message: string };

export default function FinancialVerticalsDatabasePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const selectFile = (picked: File | undefined) => {
    if (!picked) return;
    const isExcel = /\.(xlsx|xls)$/i.test(picked.name);
    if (!isExcel) {
      setResult({ kind: 'error', message: 'Please select a valid Excel file (.xlsx or .xls).' });
      return;
    }
    if (picked.size > MAX_BYTES) {
      setResult({ kind: 'error', message: 'File size must be less than 50MB.' });
      return;
    }
    setFile(picked);
    setResult(null);
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setResult(null);
    setProgress(8);
    // Simulate progress while the request is in flight (mirrors the legacy page).
    const timer = setInterval(
      () => setProgress((p) => (p < 90 ? p + Math.round((90 - p) / 4) : p)),
      400,
    );
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await researchService.uploadFinancialVerticalsDatabase(fd);
      clearInterval(timer);
      setProgress(100);
      // Phase 11: success → {success:true, message, data}; processing failures now THROW (caught below).
      setResult({ kind: 'success', res, fileName: file.name });
    } catch (e) {
      clearInterval(timer);
      setResult({ kind: 'error', message: normalizeApiError(e) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container upload-container">
      <div className="mb-4">
        <h2 className="fw-bold text-center mb-2 text-primary">
          Financial Verticals Database Creation
        </h2>
        <p className="text-center text-muted">
          Upload Excel files containing PE firm data for comprehensive processing and database
          integration
        </p>
      </div>

      {/* Requirements */}
      <div className="requirements-card">
        <h4 className="fw-bold mb-3 text-primary">
          <i className="bi bi-info-circle me-2" aria-hidden="true" />
          File Requirements
        </h4>
        <div className="row">
          <div className="col-md-6">
            <h6 className="fw-bold text-primary">Required Columns:</h6>
            <ul className="requirements-list">
              {REQUIRED_COLUMNS.map((c) => (
                <li key={c}>
                  <i className="bi bi-check-lg" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-6">
            <h6 className="fw-bold text-primary">Optional Columns:</h6>
            <ul className="requirements-list">
              {OPTIONAL_COLUMNS.map((c) => (
                <li key={c}>
                  <i className="bi bi-check-lg" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="alert alert-info mt-3">
          <i className="bi bi-lightbulb me-1" aria-hidden="true" />
          <strong>Pro Tip:</strong> The system uses AI to automatically parse locations, extract
          sectors, and classify investment status from your data.
        </div>
        <div className="text-center mt-3">
          <a
            href="/templates/Financial_Verticals_Template.xlsx"
            className="btn btn-standard btn-sm"
            download
          >
            <i className="bi bi-download me-2" aria-hidden="true" />
            Download Excel Template
          </a>
          <small className="d-block text-muted mt-1">
            Use this template to ensure your file has the correct structure
          </small>
        </div>
      </div>

      {/* Upload */}
      <div className="upload-card">
        <div
          className={`upload-area${dragOver ? ' dragover' : ''}`}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('.btn-upload')) inputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={onDrop}
        >
          <div className="upload-icon" aria-hidden="true">
            <i className="bi bi-cloud-arrow-up" />
          </div>
          <h4 className="mb-3">Upload Excel File</h4>
          <p className="mb-3">Drop your Excel file here or click to browse</p>
          <button
            type="button"
            className="btn btn-upload"
            onClick={() => inputRef.current?.click()}
          >
            <i className="bi bi-folder2-open me-2" aria-hidden="true" />
            Choose File
          </button>
          <input
            ref={inputRef}
            type="file"
            className="file-input"
            accept={ACCEPT}
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
          <p className="mt-3 mb-0 small">Supported formats: .xlsx, .xls (Max size: 50MB)</p>
        </div>

        {file && (
          <div className="file-info">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <i className="bi bi-file-earmark-excel me-2" aria-hidden="true" />
                <span>{file.name}</span>
                <span className="ms-2 small">({formatFileSize(file.size)})</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-upload"
                onClick={clearFile}
                aria-label="Remove file"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {uploading && (
          <div className="progress-container">
            <div className="d-flex justify-content-between mb-2">
              <span>Processing…</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="text-center mt-3">
          <button
            type="button"
            className="btn btn-upload btn-lg"
            onClick={upload}
            disabled={!file || uploading}
          >
            <i className="bi bi-upload me-2" aria-hidden="true" />
            Upload and Process
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="result-container">
          <div
            className={`result-card ${result.kind === 'success' ? 'result-success' : 'result-error'}`}
          >
            {result.kind === 'success' ? (
              <>
                <div className="d-flex align-items-center mb-3">
                  <i
                    className="bi bi-check-circle-fill text-success me-3 result-status-icon"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="mb-1 text-success">Processing Completed Successfully!</h4>
                    <p className="mb-0 text-muted">{result.res.message}</p>
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">{result.res.data?.firms_processed ?? 0}</div>
                    <div className="stat-label">Firms Processed</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{result.res.data?.sectors_updated ?? 0}</div>
                    <div className="stat-label">Sector Mappings Updated</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number stat-number--file">{result.fileName}</div>
                    <div className="stat-label">Source File</div>
                  </div>
                </div>
                <div className="mt-3">
                  <button type="button" className="btn btn-standard" onClick={clearFile}>
                    <i className="bi bi-plus-lg me-2" aria-hidden="true" />
                    Process Another File
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="d-flex align-items-center mb-3">
                  <i
                    className="bi bi-exclamation-circle-fill text-danger me-3 result-status-icon"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="mb-1 text-danger">Processing Failed</h4>
                    <p className="mb-0 text-muted">There was an error processing your file</p>
                  </div>
                </div>
                <div className="alert alert-danger">
                  <strong>Error:</strong> {result.message}
                </div>
                <div className="mt-3">
                  <button type="button" className="btn btn-standard" onClick={clearFile}>
                    <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
