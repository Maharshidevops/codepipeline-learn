// ColumnMappingDialog (Tier A / A10 / F9 + F9.5) — shown after the analyst clicks Generate with an
// uploaded file. The backend auto-detects the real header row (skipping preamble/metadata rows like
// PitchBook's), previews source→field mappings, and this dialog lets the analyst (a) correct the
// header row if detection was off, and (b) fix any column mapping — then confirms → the run submits
// with both header_overrides and column_overrides. Portaled to <body>.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  researchService,
  type FileMappingPreview,
  type ColumnOverrides,
  type HeaderOverrides,
  type MappingConfidence,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';
import './column-mapping.css';

interface Props {
  files: File[];
  onConfirm: (result: {
    columnOverrides: ColumnOverrides;
    headerOverrides: HeaderOverrides;
  }) => void;
  onCancel: () => void;
}

const CONFIDENCE_LABEL: Record<MappingConfidence, string> = {
  high: 'Matched',
  suggested: 'AI guess',
  override: 'Your choice',
  unmapped: 'Unmapped',
};

export default function ColumnMappingDialog({ files, onConfirm, onCancel }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<FileMappingPreview[]>([]);
  const [colEdits, setColEdits] = useState<ColumnOverrides>({});
  const [headerRows, setHeaderRows] = useState<HeaderOverrides>({});
  const initializedRef = useRef(false);

  const keyFor = (p: FileMappingPreview, i: number) => files[i]?.name ?? p.filename;

  // Fetch (or re-fetch) the preview. On the first load, seed headerRows from the backend's
  // auto-detected header per file. Kept as a plain async fn (not an effect dep) to avoid loops.
  const doLoad = async (headerOv: HeaderOverrides, colOv: ColumnOverrides) => {
    setLoading(true);
    try {
      const res = await researchService.previewMapping(files, colOv, headerOv);
      setPreviews(res);
      if (!initializedRef.current) {
        const seed: HeaderOverrides = {};
        res.forEach((p, i) => {
          seed[files[i]?.name ?? p.filename] = p.header_row;
        });
        setHeaderRows(seed);
        initializedRef.current = true;
      }
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Could not preview column mapping.');
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  // Load once on mount (files don't change during the dialog's life).
  useEffect(() => {
    void doLoad({}, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTarget = (fileKey: string, source: string, target: string) => {
    setColEdits((prev) => ({
      ...prev,
      [fileKey]: { ...(prev[fileKey] ?? {}), [source]: target },
    }));
  };

  const changeHeaderRow = (fileKey: string, row: number) => {
    // New header ⇒ different columns ⇒ this file's column edits no longer apply.
    const nextHeaders = { ...headerRows, [fileKey]: row };
    const nextCols = { ...colEdits, [fileKey]: {} };
    setHeaderRows(nextHeaders);
    setColEdits(nextCols);
    void doLoad(nextHeaders, nextCols);
  };

  const effectiveTarget = (fileKey: string, source: string, original: string) =>
    colEdits[fileKey]?.[source] ?? original;

  const confirm = () => onConfirm({ columnOverrides: colEdits, headerOverrides: headerRows });

  const missingCompanyName = useMemo(
    () =>
      previews.some(
        (p, i) =>
          !p.error &&
          !p.columns.some(
            (c) => effectiveTarget(keyFor(p, i), c.source, c.target) === 'Company Name',
          ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previews, colEdits],
  );

  const rowLabel = (sample: string[] | undefined, idx: number) => {
    const cells = (sample ?? [])
      .filter((c) => c && c.trim())
      .slice(0, 3)
      .join(', ');
    return `Row ${idx + 1}${cells ? `: ${cells}` : ''}`;
  };

  return createPortal(
    <div className="modal-backdrop-inline" role="dialog" aria-label="Confirm column mapping">
      <div className="column-mapping-modal">
        <h5 className="mb-1">Confirm column mapping</h5>
        <p className="text-muted small mb-3">
          Here&apos;s how your file columns will map to our fields. If the header row is wrong, fix
          it first — then correct any column, and continue.
        </p>

        {loading ? (
          <div className="text-center p-4">Loading preview…</div>
        ) : (
          <div className="column-mapping-body">
            {previews.map((p, i) => {
              const fileKey = keyFor(p, i);
              return (
                <div key={p.filename} className="mb-3">
                  <div className="fw-semibold mb-1">{fileKey}</div>

                  {/* Header-row picker (F9.5) — lets the analyst correct which row holds the headers. */}
                  {p.row_count > 1 && (
                    <div className="d-flex align-items-center gap-2 mb-2 small">
                      <label htmlFor={`hdr-${i}`} className="text-muted mb-0">
                        Header row:
                      </label>
                      <select
                        id={`hdr-${i}`}
                        className="form-select form-select-sm w-auto"
                        aria-label={`Header row for ${fileKey}`}
                        value={headerRows[fileKey] ?? p.header_row}
                        onChange={(e) => changeHeaderRow(fileKey, Number(e.target.value))}
                      >
                        {Array.from({ length: Math.min(p.row_count, 12) }, (_, idx) => (
                          <option key={idx} value={idx}>
                            {rowLabel(p.raw_sample?.[idx], idx)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {p.error ? (
                    <div className="text-danger small">{p.error}</div>
                  ) : (
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Your column</th>
                          <th>Maps to</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.columns.map((c) => (
                          <tr key={c.source}>
                            <td className="text-truncate" style={{ maxWidth: 180 }}>
                              {c.source}
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                aria-label={`Map ${c.source}`}
                                value={effectiveTarget(fileKey, c.source, c.target)}
                                onChange={(e) => setTarget(fileKey, c.source, e.target.value)}
                              >
                                <option value="">— ignore —</option>
                                {p.mappable_fields.map((f) => (
                                  <option key={f} value={f}>
                                    {f}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="small text-muted">{CONFIDENCE_LABEL[c.confidence]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            {missingCompanyName && (
              <div className="alert alert-warning py-2 small mb-0">
                No column is mapped to <strong>Company Name</strong> — results may be unusable. Map
                one (or fix the header row) if you can.
              </div>
            )}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button type="button" className="btn btn-sm btn-standard" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={confirm}
            disabled={loading}
          >
            Confirm &amp; generate
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
