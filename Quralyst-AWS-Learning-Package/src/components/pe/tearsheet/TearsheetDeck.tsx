// Tearsheet slide deck renderer with keyboard navigation (F40.2).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Spinner } from '@/components/ui';
import { CostTooltip } from '@/components/pe/tearsheet/CostTooltip';
import { useGammaExport } from '@/components/pe/tearsheet/useGammaExport';
import {
  buildSlides,
  type ChartSeries,
  type Slide,
  type SlideBlock,
  type SlidePerson,
} from '@/lib/tearsheet/buildSlides';
import { downloadTearsheetPdf } from '@/lib/tearsheet/downloadPdf';
import { downloadTearsheetPptx } from '@/lib/tearsheet/downloadPptx';
import type { Confidence, Tearsheet } from '@/types';
import '@/styles/pages/tearsheet-deck.css';

const CONFIDENCE_CLASS: Record<Confidence, string> = {
  high: 'text-bg-success',
  medium: 'text-bg-warning',
  low: 'text-bg-danger',
  unknown: 'text-bg-secondary',
};

function ConfidenceBadge({ value }: { value?: Confidence }) {
  if (!value) return null;
  return (
    <span
      className={`badge rounded-pill text-uppercase ${CONFIDENCE_CLASS[value]}`}
      data-testid="tearsheet-confidence"
    >
      {value} confidence
    </span>
  );
}

function PersonRow({ p }: { p: SlidePerson }) {
  return (
    <div className="border-bottom border-dashed py-2" style={{ borderColor: '#e2e8f0' }}>
      <div className="d-flex justify-content-between gap-2">
        <span className="fw-semibold" style={{ color: '#0f172a' }}>
          {p.name}
        </span>
        {p.title ? (
          <span className="small text-end" style={{ color: '#64748b' }}>
            {p.title}
          </span>
        ) : null}
      </div>
      {p.detail ? (
        <p className="small mb-0 mt-1" style={{ color: '#64748b' }}>
          {p.detail}
        </p>
      ) : null}
    </div>
  );
}

function fmtChartDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtChartVal(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v));
}

function LineChart({ series }: { series: ChartSeries }) {
  const { heading, color = '#3b82f6', points } = series;
  if (points.length < 2) return null;

  const VW = 480;
  const VH = 150;
  const PAD = { top: 12, right: 12, bottom: 26, left: 38 };
  const cW = VW - PAD.left - PAD.right;
  const cH = VH - PAD.top - PAD.bottom;

  const values = points.map(([, v]) => v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const px = (i: number) => PAD.left + (i / (points.length - 1)) * cW;
  const py = (v: number) => PAD.top + (1 - (v - minV) / range) * cH;

  const linePath = points
    .map(([, v], i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${px(points.length - 1).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;

  const yLines = [0, 0.5, 1].map((t) => ({
    y: PAD.top + (1 - t) * cH,
    label: fmtChartVal(minV + t * range),
  }));

  const xCount = Math.min(5, points.length);
  const xIdxs = Array.from({ length: xCount }, (_, i) =>
    Math.round((i / (xCount - 1)) * (points.length - 1)),
  );

  return (
    <div data-testid="tearsheet-line-chart">
      {heading ? (
        <h3 className="h6 text-uppercase mb-1" style={{ color: '#1d4ed8' }}>
          {heading}
        </h3>
      ) : null}
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height={VH} role="img" aria-label={heading}>
        {yLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={g.y}
              x2={VW - PAD.right}
              y2={g.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={PAD.left - 4} y={g.y + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8">
              {g.label}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={color} fillOpacity="0.12" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={px(0)} cy={py(values[0]!)} r="3" fill={color} />
        <circle cx={px(points.length - 1)} cy={py(values[values.length - 1]!)} r="3" fill={color} />
        {xIdxs.map((idx) => (
          <text
            key={idx}
            x={px(idx)}
            y={VH - 4}
            textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
            fontSize="9"
            fill="#94a3b8"
          >
            {fmtChartDate(points[idx]![0])}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Block({ block }: { block: SlideBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p className="mb-0" style={{ color: '#0f172a' }}>
          {block.text}
        </p>
      );
    case 'bullets':
      return (
        <div>
          {block.heading ? (
            <h3 className="h6 text-uppercase" style={{ color: '#1d4ed8' }}>
              {block.heading}
            </h3>
          ) : null}
          <ul className="mb-0" style={{ color: '#0f172a' }}>
            {block.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      );
    case 'columns':
      return (
        <div className="row g-4">
          {block.columns.map((col, i) => (
            <div key={i} className="col">
              {col.heading ? (
                <h3 className="h6 text-uppercase" style={{ color: '#1d4ed8' }}>
                  {col.heading}
                </h3>
              ) : null}
              <ul className="mb-0" style={{ color: '#0f172a' }}>
                {col.items.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case 'keyvalue':
      return (
        <dl className="row mb-0">
          {block.rows.map(([k, v], i) => (
            <div
              key={i}
              className="col-md-6 d-flex justify-content-between border-bottom py-1"
              style={{ borderColor: '#e2e8f0' }}
            >
              <dt style={{ color: '#64748b' }}>{k}</dt>
              <dd className="mb-0 fw-semibold text-end" style={{ color: '#0f172a' }}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      );
    case 'table':
      return (
        <div className="tearsheet-table-wrap">
          <table className="tearsheet-table table table-sm align-middle mb-0">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className={j === 0 ? 'fw-medium' : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'charts':
      return (
        <div className="row g-4">
          {block.items.map((s, i) => (
            <div key={i} className="col-md-6">
              <LineChart series={s} />
            </div>
          ))}
        </div>
      );
    case 'people':
      return (
        <div className="row g-4">
          {block.groups.map((g, i) => (
            <div key={i} className="col-md-6">
              {g.heading ? (
                <h3 className="h6 text-uppercase" style={{ color: '#1d4ed8' }}>
                  {g.heading}
                </h3>
              ) : null}
              {g.people.map((p, j) => (
                <PersonRow key={j} p={p} />
              ))}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function SlideView({
  slide,
  company,
  index,
  total,
}: {
  slide: Slide;
  company: string;
  index: number;
  total: number;
}) {
  if (slide.variant === 'title') {
    return (
      <div
        className="tearsheet-slide-title d-flex flex-column justify-content-center h-100 px-5 position-relative"
        style={{ background: 'var(--brand-navy, #282561)', color: '#f8fafc' }}
        data-testid="tearsheet-slide-title"
        data-bs-theme="dark"
      >
        <img
          src="/images/quralyst-logo.svg"
          alt="QuraLyst"
          className="tearsheet-brand-logo"
          data-testid="tearsheet-logo"
        />
        <div
          className="small text-uppercase fw-semibold"
          style={{ color: '#93c5fd', letterSpacing: '0.08em', fontSize: 12 }}
        >
          {slide.kicker}
        </div>
        <h2 className="display-5 fw-bold mt-3 mb-0" style={{ color: '#ffffff' }}>
          {slide.title}
        </h2>
        {slide.subtitle ? (
          <p className="lead mt-3 mb-0" style={{ color: '#e2e8f0', maxWidth: '36rem' }}>
            {slide.subtitle}
          </p>
        ) : null}
        <div className="d-flex gap-4 mt-4 small" style={{ color: '#94a3b8' }}>
          {slide.website ? <span>{slide.website}</span> : null}
          {slide.meta ? <span>{slide.meta}</span> : null}
        </div>
        <img src="/images/quralyst-logo.svg" alt="" aria-hidden className="tearsheet-brand-mark" />
      </div>
    );
  }

  return (
    <div
      className="d-flex flex-column h-100 px-4 py-4"
      style={{ background: '#ffffff', color: '#0f172a' }}
      data-testid="tearsheet-slide-content"
      data-bs-theme="light"
    >
      <header
        className="pb-2 mb-3"
        style={{ borderBottom: '1px solid var(--brand-navy, #282561)' }}
      >
        <div className="d-flex justify-content-between align-items-center gap-2">
          {slide.kicker ? (
            <span
              className="small text-uppercase fw-semibold"
              style={{ color: 'var(--brand-navy, #282561)', letterSpacing: '0.04em' }}
            >
              {slide.kicker}
            </span>
          ) : (
            <span />
          )}
          <ConfidenceBadge value={slide.confidence} />
        </div>
        <h2 className="h3 fw-bold mb-0 mt-1" style={{ color: 'var(--brand-navy, #282561)' }}>
          {slide.title}
        </h2>
      </header>
      <div className="flex-grow-1 overflow-hidden">
        <div className="d-flex flex-column gap-3">
          {slide.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
      </div>
      <footer className="d-flex justify-content-between small pt-2" style={{ color: '#64748b' }}>
        <span>{company}</span>
        <span>
          {index} / {total}
        </span>
      </footer>
    </div>
  );
}

export function TearsheetDeck({
  data,
  initialSlide = 0,
  onRegenerate,
  regenerating = false,
  polishedReady = false,
  gammaGenerating = false,
  onViewPolished,
}: {
  data: Tearsheet;
  initialSlide?: number;
  onRegenerate?: () => void | Promise<void>;
  regenerating?: boolean;
  polishedReady?: boolean;
  gammaGenerating?: boolean;
  onViewPolished?: () => void;
}) {
  const slides = useMemo(() => buildSlides(data), [data]);
  const total = slides.length;
  const [current, setCurrent] = useState(() =>
    Math.min(Math.max(initialSlide, 0), Math.max(total - 1, 0)),
  );

  const go = useCallback(
    (dir: number) => setCurrent((c) => Math.min(Math.max(c + dir, 0), total - 1)),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Home') {
        setCurrent(0);
      } else if (e.key === 'End') {
        setCurrent(total - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, total]);

  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  // Only worth pre-loading where the polished download button actually renders.
  const gammaExport = useGammaExport(data.id, data.companyName, { load: polishedReady });

  const exportPptx = async () => {
    setExporting(true);
    try {
      await downloadTearsheetPptx(data);
    } catch (err) {
      console.error('PPTX export failed', err);
      alert('Sorry, the PowerPoint export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!deckRef.current || pdfExporting) return;
    setPdfExporting(true);
    try {
      await downloadTearsheetPdf(deckRef.current, data.companyName);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Sorry, the PDF export failed. Please try again.');
    } finally {
      setPdfExporting(false);
    }
  };

  const regenerate = async () => {
    if (!onRegenerate || regenerating) return;
    const ok = window.confirm(
      `Regenerate the tearsheet for ${data.companyName}? This re-runs research and may incur API costs.`,
    );
    if (!ok) return;
    await onRegenerate();
  };

  return (
    <div
      className="tearsheet-deck d-flex flex-column"
      data-testid="tearsheet-deck"
      data-bs-theme="light"
      style={{
        // Fit inside AppLayout workspace: one screen, no page scroll to reach nav.
        height: 'calc(100dvh - var(--chrome-pad-top, 1.5rem) - var(--chrome-pad-bottom, 1.5rem))',
        maxHeight:
          'calc(100dvh - var(--chrome-pad-top, 1.5rem) - var(--chrome-pad-bottom, 1.5rem))',
        overflow: 'hidden',
        background: '#f1f5f9',
        color: '#0f172a',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
      }}
    >
      <header
        className="d-flex align-items-center justify-content-between gap-3 px-3 py-2 flex-shrink-0"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          minHeight: 56,
        }}
      >
        <div className="text-truncate" style={{ minWidth: 0 }}>
          <div
            className="fw-bold text-truncate"
            style={{ color: '#0f172a', fontSize: 16, lineHeight: 1.25 }}
            data-testid="tearsheet-title"
          >
            {data.companyName}
          </div>
          <div className="small" style={{ color: '#64748b' }}>
            Tearsheet
            {data.updatedAt ? (
              <span className="ms-2">
                · Updated {new Date(data.updatedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
          {data.cost ? <CostTooltip cost={data.cost} /> : null}
          {gammaGenerating && !polishedReady ? (
            <span
              className="badge fw-semibold px-2 py-2 d-none d-md-inline-flex align-items-center gap-1"
              style={{ background: '#eef2ff', color: '#4338ca', fontSize: 12 }}
              data-testid="tearsheet-gamma-generating"
            >
              <Spinner size="sm" />
              Polishing…
            </span>
          ) : null}
          {polishedReady && onViewPolished ? (
            <Button
              variant="popup-primary"
              className="btn-sm"
              onClick={onViewPolished}
              data-testid="tearsheet-polished-version"
              title="Open polished tearsheet in a full page"
            >
              <i className="bi bi-stars" aria-hidden />
              <span className="ms-1">Polished PDF</span>
            </Button>
          ) : null}
          <span
            className="badge fw-semibold px-2 py-2 d-none d-md-inline-flex align-items-center"
            style={{ background: '#e2e8f0', color: '#334155', fontSize: 12 }}
            data-testid="tearsheet-slide-count"
            aria-live="polite"
          >
            Slide {current + 1} / {total}
          </span>
          {onRegenerate ? (
            <Button
              variant="popup-secondary"
              className="btn-sm"
              onClick={regenerate}
              disabled={regenerating || pdfExporting || exporting}
              data-testid="tearsheet-regenerate"
              title="Re-run research and rebuild this tearsheet"
            >
              {regenerating ? (
                <Spinner size="sm" />
              ) : (
                <i className="bi bi-arrow-clockwise" aria-hidden />
              )}
              <span className="ms-1 d-none d-sm-inline">Regenerate</span>
            </Button>
          ) : null}
          {polishedReady ? (
            <button
              type="button"
              className="btn btn-sm btn-dark"
              onClick={() => gammaExport.download('pdf')}
              disabled={!gammaExport.pdfAvailable || !!gammaExport.pending}
              data-testid="tearsheet-download-gamma-pdf"
              title="Download the polished Gamma PDF"
            >
              <i className="bi bi-download me-1" aria-hidden />
              Download PDF
            </button>
          ) : (
            <Button
              variant="popup-secondary"
              className="btn-sm"
              onClick={exportPdf}
              disabled={pdfExporting || regenerating}
              data-testid="tearsheet-export-pdf"
              title="Export this data deck as PDF"
            >
              {pdfExporting ? <Spinner size="sm" /> : <i className="bi bi-download" aria-hidden />}
              <span className="ms-1">PDF</span>
            </Button>
          )}
          <Button
            variant="popup-secondary"
            className="btn-sm"
            onClick={exportPptx}
            disabled={exporting || regenerating}
            data-testid="tearsheet-export-pptx"
          >
            {exporting ? (
              <Spinner size="sm" />
            ) : (
              <i className="bi bi-file-earmark-slides" aria-hidden />
            )}
            <span className="ms-1">PowerPoint</span>
          </Button>
        </div>
      </header>

      <div
        ref={deckRef}
        className="tearsheet-stage flex-grow-1"
        style={{
          minHeight: 0,
          position: 'relative',
          containerType: 'size',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 12,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {slides.map((s, i) => (
            <div
              key={s.id}
              data-tearsheet-slide
              className="shadow-sm rounded overflow-hidden"
              style={{
                display: i === current ? 'block' : 'none',
                aspectRatio: '16 / 9',
                width: 'min(100%, 960px, calc(100cqh * 16 / 9))',
                maxHeight: '100%',
                background: '#ffffff',
                color: '#0f172a',
              }}
              data-bs-theme="light"
              data-testid={i === current ? 'tearsheet-slide-active' : undefined}
            >
              <SlideView slide={s} company={data.companyName} index={i + 1} total={total} />
            </div>
          ))}
        </div>
      </div>

      <footer
        className="d-flex align-items-center justify-content-center gap-3 px-3 py-2 flex-shrink-0"
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          minHeight: 52,
        }}
      >
        <Button
          variant="standard"
          className="btn-sm"
          onClick={() => go(-1)}
          disabled={current === 0}
          style={{ color: '#0f172a' }}
        >
          <i className="bi bi-chevron-left" aria-hidden /> Prev
        </Button>
        <div className="d-flex gap-1 align-items-center" aria-label="Slide navigation">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="btn btn-sm rounded-circle p-0 border-0"
              style={{
                width: 10,
                height: 10,
                background: i === current ? '#0f172a' : '#cbd5e1',
              }}
              aria-label={`Go to slide ${i + 1}${i === current ? ' (current)' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
        <Button
          variant="standard"
          className="btn-sm"
          onClick={() => go(1)}
          disabled={current === total - 1}
          style={{ color: '#0f172a' }}
        >
          Next <i className="bi bi-chevron-right" aria-hidden />
        </Button>
        <span
          className="small fw-semibold tabular-nums ms-1"
          style={{ color: '#334155', minWidth: 48 }}
          data-testid="tearsheet-slide-index"
        >
          {current + 1} / {total}
        </span>
      </footer>
    </div>
  );
}
