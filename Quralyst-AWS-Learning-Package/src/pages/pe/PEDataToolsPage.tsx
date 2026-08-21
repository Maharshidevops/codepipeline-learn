// PE Data Tools page (F42.3) — single-shot + bulk enrichment utilities + jobs.
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Spinner } from '@/components/ui';
import { peDataToolsService } from '@/services/api';
import { formatDateTimeShort } from '@/lib/datetime';
import type { ApiError, DataToolJob, PeLookupType } from '@/types';
import {
  BulkParseError,
  bulkColumnsHint,
  CSV_BOM,
  csvColsForJobType,
  downloadSampleCsv,
  parseBulkFile,
  parseCsvBulk,
  rowsToCsv,
  sampleCsvFilename,
  sampleCsvForTool,
  sampleCsvRows,
  type BulkItem,
  type DataToolBulkKind,
  type GicsBulkItem,
  type LocationBulkItem,
  type PeBulkItem,
  type UrlBulkItem,
} from '@/pages/pe/dataToolsCsv';
import '@/styles/pages/data-tools.css';

const BULK_ACCEPT = '.csv,.xlsx,.xls';
const BULK_MAX_BYTES = 10 * 1024 * 1024;

type TopTab = 'url' | 'pe' | 'location' | 'gics' | 'jobs';
type Mode = 'single' | 'paste' | 'upload';

const LOOKUP_TYPES: PeLookupType[] = ['investment', 'exit', 'status', 'profile', 'combined'];

function StatusBadges({
  status,
  confidence,
}: {
  status?: string | null;
  confidence?: string | null;
}) {
  const statusTone =
    status === 'found'
      ? 'info'
      : status === 'not_found'
        ? 'secondary'
        : status === 'skipped_budget'
          ? 'warning'
          : status === 'error'
            ? 'danger'
            : 'secondary';
  const confTone =
    confidence === 'high'
      ? 'info'
      : confidence === 'medium'
        ? 'secondary'
        : confidence === 'low'
          ? 'warning'
          : 'secondary';
  return (
    <span className="d-inline-flex gap-1 flex-wrap">
      {status ? <Badge tone={statusTone}>{status}</Badge> : null}
      {confidence ? <Badge tone={confTone}>{confidence}</Badge> : null}
    </span>
  );
}

function resultValue(tab: TopTab, row: Record<string, unknown>): string {
  if (tab === 'url') return row.url ? String(row.url) : '—';
  if (tab === 'pe') {
    const bits = [
      row.currentStatus,
      row.investmentYear != null ? `inv ${row.investmentYear}` : null,
      row.exitYear != null ? `exit ${row.exitYear}` : null,
      row.website,
    ].filter(Boolean);
    return bits.length ? bits.map(String).join(' · ') : '—';
  }
  if (tab === 'location') {
    const bits = [row.city, row.stateRegion, row.country].filter(Boolean);
    return bits.length ? bits.map(String).join(', ') : '—';
  }
  if (tab === 'gics') {
    const bits = [row.sectorName, row.industryGroupName, row.industryName].filter(Boolean);
    return bits.length ? bits.map(String).join(' / ') : '—';
  }
  return '—';
}

function jobTypeToTab(jobType: string): Exclude<TopTab, 'jobs'> {
  if (jobType === 'pe_lookup') return 'pe';
  if (jobType === 'location') return 'location';
  if (jobType === 'gics_classify') return 'gics';
  return 'url';
}

function resultName(row: Record<string, unknown>): string {
  return String(row.companyName || row.portfolioCompany || '—');
}

function ResultCell({ tab, row }: { tab: TopTab; row: Record<string, unknown> }) {
  const value = resultValue(tab, row);
  if (tab === 'url' && row.url) {
    const href = String(row.url);
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {href}
      </a>
    );
  }
  return <span>{value}</span>;
}

function ResultSummary({ tab, row }: { tab: TopTab; row: Record<string, unknown> }) {
  if (tab === 'url') {
    const url = row.url ? String(row.url) : null;
    return (
      <div>
        <div className="mb-1">
          <span className="text-muted small">Company</span>
          <div>{String(row.companyName || '—')}</div>
        </div>
        <div className="mb-1">
          <span className="text-muted small">URL</span>
          <div>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" data-testid="result-url">
                {url}
              </a>
            ) : (
              <span className="text-muted">No URL found</span>
            )}
          </div>
        </div>
        {row.errorMessage ? (
          <div className="small text-danger">{String(row.errorMessage)}</div>
        ) : null}
      </div>
    );
  }
  if (tab === 'location') {
    return (
      <div className="small">
        <div>
          <strong>Location:</strong> {resultValue(tab, row)}
        </div>
        {row.website ? (
          <div>
            <strong>Website:</strong> {String(row.website)}
          </div>
        ) : null}
      </div>
    );
  }
  if (tab === 'gics') {
    return (
      <div className="small">
        <div>
          <strong>Classification:</strong> {resultValue(tab, row)}
        </div>
        {row.reasoning ? <div className="text-muted mt-1">{String(row.reasoning)}</div> : null}
      </div>
    );
  }
  if (tab === 'pe') {
    return (
      <div className="small">
        <div>
          <strong>Summary:</strong> {resultValue(tab, row)}
        </div>
        {row.investmentYearEvidence ? (
          <div className="text-muted mt-1">{String(row.investmentYearEvidence)}</div>
        ) : null}
      </div>
    );
  }
  return (
    <pre className="small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(row, null, 2)}
    </pre>
  );
}

function DemoCsvPanel({ kind }: { kind: DataToolBulkKind }) {
  const [open, setOpen] = useState(false);
  const rows = sampleCsvRows(kind);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const labels: Record<DataToolBulkKind, string> = {
    url: 'URL Lookup',
    pe: 'PE Lookup',
    location: 'Location',
    gics: 'GICS',
  };

  return (
    <div className="demo-csv-panel" data-testid="demo-csv-panel">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <strong className="me-1">Demo CSV</strong>
          <span className="small text-muted">
            Sample {labels[kind]} file ({sampleCsvFilename(kind)})
          </span>
        </div>
        <div className="demo-csv-actions">
          <Button
            variant="popup-secondary"
            onClick={() => setOpen((v) => !v)}
            data-testid="demo-csv-view"
            aria-expanded={open}
          >
            {open ? 'Hide demo' : 'View demo'}
          </Button>
          <Button
            variant="standard"
            onClick={() => downloadSampleCsv(kind)}
            data-testid="demo-csv-download"
          >
            Download demo CSV
          </Button>
        </div>
      </div>
      {open ? (
        <div className="table-responsive mt-3">
          <table className="table align-middle mb-0 data-tools-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th scope="col" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h}>{r[h] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <pre data-testid="demo-csv-raw">{sampleCsvForTool(kind)}</pre>
        </div>
      ) : null}
    </div>
  );
}

function JobProgress({ jobId }: { jobId: string }) {
  const { data: job } = useQuery({
    queryKey: ['pe', 'data-tools', 'job', jobId],
    queryFn: () => peDataToolsService.getJob(jobId),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 1500 : false),
  });
  if (!job) {
    return (
      <div className="text-muted small">
        <Spinner size="sm" /> Loading job…
      </div>
    );
  }
  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  return (
    <div className="card mb-3" data-testid="job-progress">
      <div className="card-body">
        <div className="d-flex justify-content-between small mb-1">
          <span>
            Job {job.id.slice(0, 8)} · {job.jobType} · {job.status}
          </span>
          <span>
            {job.processed}/{job.total} ({pct}%)
          </span>
        </div>
        <div className="progress mb-2" style={{ height: 8 }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${pct}%` }}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="small text-muted">
          found {job.found} · not found {job.notFoundCount} · errors {job.errorCount}
        </div>
      </div>
    </div>
  );
}

async function downloadJobCsv(job: DataToolJob) {
  const PAGE = 500;
  let offset = 0;
  let total = Infinity;
  const allRows: Record<string, unknown>[] = [];
  while (allRows.length < total) {
    const page = await peDataToolsService.getJobResults(job.id, PAGE, offset);
    total = page.total;
    allRows.push(...page.results);
    offset += PAGE;
    if (page.results.length === 0) break;
  }
  const cols = csvColsForJobType(job.jobType);
  const csv = CSV_BOM + rowsToCsv(cols, allRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${job.jobType}-${job.id.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PEDataToolsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TopTab>('url');
  const [mode, setMode] = useState<Mode>('single');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // URL single
  const [urlName, setUrlName] = useState('');
  const [urlLoc, setUrlLoc] = useState('');
  const [urlDesc, setUrlDesc] = useState('');
  // PE
  const [peCompany, setPeCompany] = useState('');
  const [peFirm, setPeFirm] = useState('');
  const [peType, setPeType] = useState<PeLookupType>('combined');
  // Location
  const [locName, setLocName] = useState('');
  const [locWeb, setLocWeb] = useState('');
  // GICS
  const [gicsName, setGicsName] = useState('');
  const [gicsDesc, setGicsDesc] = useState('');
  const [gicsProducts, setGicsProducts] = useState('');
  const [gicsKw, setGicsKw] = useState('');
  const [gicsWeb, setGicsWeb] = useState('');

  const [bulkText, setBulkText] = useState('');
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [resultsJobId, setResultsJobId] = useState<string | null>(null);

  const bulkKind: DataToolBulkKind =
    tab === 'pe' ? 'pe' : tab === 'location' ? 'location' : tab === 'gics' ? 'gics' : 'url';

  const clearBulkFile = () => {
    setBulkItems([]);
    setBulkFileName(null);
    if (bulkInputRef.current) bulkInputRef.current.value = '';
  };

  const clearBulkPaste = () => setBulkText('');

  const submitBulkItems = async (items: BulkItem[]) => {
    if (!items.length) throw new Error('No rows to process.');
    if (tab === 'url') return peDataToolsService.bulkUrl(items as UrlBulkItem[]);
    if (tab === 'pe') return peDataToolsService.bulkPe(items as PeBulkItem[]);
    if (tab === 'location') return peDataToolsService.bulkLocation(items as LocationBulkItem[]);
    return peDataToolsService.bulkGics(items as GicsBulkItem[]);
  };

  const loadBulkFile = async (file: File | undefined) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!/\.(csv|xlsx|xls)$/.test(lower)) {
      setError('Please upload a .csv, .xlsx, or .xls file.');
      clearBulkFile();
      return;
    }
    if (file.size > BULK_MAX_BYTES) {
      setError('File must be under 10MB.');
      clearBulkFile();
      return;
    }
    setBulkParsing(true);
    setError(null);
    try {
      const items = await parseBulkFile(file, bulkKind);
      setBulkItems(items);
      setBulkFileName(file.name);
    } catch (e) {
      clearBulkFile();
      setError(
        e instanceof BulkParseError || e instanceof Error ? e.message : 'Failed to parse file',
      );
    } finally {
      setBulkParsing(false);
    }
  };

  const recentKey = useMemo(() => ['pe', 'data-tools', 'recent', tab], [tab]);

  const recentQuery = useQuery({
    queryKey: recentKey,
    enabled: tab !== 'jobs' && mode === 'single',
    queryFn: async () => {
      if (tab === 'url') return peDataToolsService.recentUrl();
      if (tab === 'pe') return peDataToolsService.recentPe();
      if (tab === 'location') return peDataToolsService.recentLocation();
      return peDataToolsService.recentGics();
    },
  });

  const jobsQuery = useQuery({
    queryKey: ['pe', 'data-tools', 'jobs'],
    enabled: tab === 'jobs',
    queryFn: () => peDataToolsService.listJobs(20),
    refetchInterval: 5000,
  });

  const resultsQuery = useQuery({
    queryKey: ['pe', 'data-tools', 'results', resultsJobId],
    enabled: !!resultsJobId,
    queryFn: () => peDataToolsService.getJobResults(resultsJobId!, 100, 0),
  });

  const errMsg = (e: unknown) =>
    (e as ApiError)?.message || (e instanceof Error ? e.message : 'Request failed');

  const singleMut = useMutation({
    mutationFn: async () => {
      if (tab === 'url') {
        return peDataToolsService.urlLookup({
          companyName: urlName,
          location: urlLoc || undefined,
          description: urlDesc || undefined,
        });
      }
      if (tab === 'pe') {
        return peDataToolsService.peLookup({
          portfolioCompany: peCompany,
          peFirm,
          lookupType: peType,
        });
      }
      if (tab === 'location') {
        return peDataToolsService.locationLookup({
          companyName: locName,
          website: locWeb || undefined,
        });
      }
      const keywords = gicsKw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return peDataToolsService.gicsClassify({
        companyName: gicsName,
        description: gicsDesc || undefined,
        productsServices: gicsProducts || undefined,
        keywords: keywords.length ? keywords : undefined,
        website: gicsWeb || undefined,
      });
    },
    onSuccess: (data) => {
      setError(null);
      setLastResult(data as unknown as Record<string, unknown>);
      void qc.invalidateQueries({ queryKey: recentKey });
    },
    onError: (e) => setError(errMsg(e)),
  });

  const bulkMut = useMutation({
    mutationFn: async () => {
      if (mode === 'paste') {
        if (!bulkText.trim()) throw new Error('Paste CSV (with a header row) first.');
        const items = parseCsvBulk(bulkText, bulkKind);
        return submitBulkItems(items);
      }
      if (!bulkItems.length) throw new Error('Upload a CSV or Excel file first.');
      return submitBulkItems(bulkItems);
    },
    onSuccess: (job) => {
      setError(null);
      setMessage(null);
      setActiveJobId(job.id);
      clearBulkFile();
      clearBulkPaste();
      void qc.invalidateQueries({ queryKey: ['pe', 'data-tools', 'jobs'] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  const holdingsMut = useMutation({
    mutationFn: () => peDataToolsService.classifyHoldings(),
    onSuccess: (data) => {
      setError(null);
      if ('count' in data && data.count === 0) {
        setMessage(data.message || 'All holdings already classified');
        setActiveJobId(null);
        return;
      }
      if ('id' in data && data.id) {
        setMessage(null);
        setActiveJobId(data.id);
      }
      void qc.invalidateQueries({ queryKey: ['pe', 'data-tools', 'jobs'] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  const resumeMut = useMutation({
    mutationFn: (id: string) => peDataToolsService.resumeJob(id),
    onSuccess: (r) => {
      if (r.resumed) setActiveJobId(r.jobId);
      void qc.invalidateQueries({ queryKey: ['pe', 'data-tools', 'jobs'] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <div className="container-fluid py-4 data-tools-page px-3 px-lg-4">
      <h1 className="h3 mb-1">Data Tools</h1>
      <p className="text-muted mb-3">
        Standalone enrichment utilities — URL, PE lookup, location, and GICS — single-shot or bulk.
      </p>

      <ul className="data-tools-tabs" role="tablist" aria-label="Data tool">
        {(
          [
            ['url', 'URL Lookup'],
            ['pe', 'PE Lookup'],
            ['location', 'Location'],
            ['gics', 'GICS'],
            ['jobs', 'Jobs'],
          ] as const
        ).map(([k, label]) => (
          <li className="nav-item" key={k} role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={`nav-link ${tab === k ? 'active' : ''}`}
              onClick={() => {
                setTab(k);
                setError(null);
                setMessage(null);
                clearBulkFile();
                clearBulkPaste();
              }}
              data-testid={`tab-${k}`}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <div className="alert alert-danger" role="alert" data-testid="tools-error">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-info" role="status" data-testid="tools-message">
          {message}
        </div>
      ) : null}

      {activeJobId ? <JobProgress jobId={activeJobId} /> : null}

      {tab !== 'jobs' ? (
        <>
          <div className="data-tools-modes" role="group" aria-label="Input mode">
            <button
              type="button"
              className={`btn btn-sm ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
              data-testid="mode-single"
            >
              Single
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'paste' ? 'active' : ''}`}
              onClick={() => {
                setMode('paste');
                clearBulkFile();
              }}
              data-testid="mode-paste"
            >
              Paste CSV
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => {
                setMode('upload');
                clearBulkPaste();
              }}
              data-testid="mode-upload"
            >
              Upload file
            </button>
          </div>

          <DemoCsvPanel kind={bulkKind} />

          {mode === 'single' ? (
            <div className="card mb-3">
              <div className="card-body">
                {tab === 'url' ? (
                  <>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-url-company">
                        Company name
                      </label>
                      <input
                        id="dt-url-company"
                        className="form-control"
                        value={urlName}
                        onChange={(e) => setUrlName(e.target.value)}
                        data-testid="url-company"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-url-location">
                        Location (optional)
                      </label>
                      <input
                        id="dt-url-location"
                        className="form-control"
                        value={urlLoc}
                        onChange={(e) => setUrlLoc(e.target.value)}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-url-description">
                        Description (optional)
                      </label>
                      <textarea
                        id="dt-url-description"
                        className="form-control"
                        rows={2}
                        value={urlDesc}
                        onChange={(e) => setUrlDesc(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                {tab === 'pe' ? (
                  <>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-pe-company">
                        Portfolio company
                      </label>
                      <input
                        id="dt-pe-company"
                        className="form-control"
                        value={peCompany}
                        onChange={(e) => setPeCompany(e.target.value)}
                        data-testid="pe-company"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-pe-firm">
                        PE firm
                      </label>
                      <input
                        id="dt-pe-firm"
                        className="form-control"
                        value={peFirm}
                        onChange={(e) => setPeFirm(e.target.value)}
                        data-testid="pe-firm"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-pe-type">
                        Lookup type
                      </label>
                      <select
                        id="dt-pe-type"
                        className="form-select"
                        value={peType}
                        onChange={(e) => setPeType(e.target.value as PeLookupType)}
                        data-testid="pe-type"
                      >
                        {LOOKUP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}
                {tab === 'location' ? (
                  <>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-loc-company">
                        Company name
                      </label>
                      <input
                        id="dt-loc-company"
                        className="form-control"
                        value={locName}
                        onChange={(e) => setLocName(e.target.value)}
                        data-testid="loc-company"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-loc-website">
                        Website (optional)
                      </label>
                      <input
                        id="dt-loc-website"
                        className="form-control"
                        value={locWeb}
                        onChange={(e) => setLocWeb(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                {tab === 'gics' ? (
                  <>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-gics-company">
                        Company name
                      </label>
                      <input
                        id="dt-gics-company"
                        className="form-control"
                        value={gicsName}
                        onChange={(e) => setGicsName(e.target.value)}
                        data-testid="gics-company"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-gics-description">
                        Description
                      </label>
                      <textarea
                        id="dt-gics-description"
                        className="form-control"
                        rows={2}
                        value={gicsDesc}
                        onChange={(e) => setGicsDesc(e.target.value)}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-gics-products">
                        Products / services
                      </label>
                      <input
                        id="dt-gics-products"
                        className="form-control"
                        value={gicsProducts}
                        onChange={(e) => setGicsProducts(e.target.value)}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-gics-keywords">
                        Keywords (comma-separated)
                      </label>
                      <input
                        id="dt-gics-keywords"
                        className="form-control"
                        value={gicsKw}
                        onChange={(e) => setGicsKw(e.target.value)}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor="dt-gics-website">
                        Website
                      </label>
                      <input
                        id="dt-gics-website"
                        className="form-control"
                        value={gicsWeb}
                        onChange={(e) => setGicsWeb(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                <Button
                  onClick={() => singleMut.mutate()}
                  disabled={singleMut.isPending}
                  data-testid="run-single"
                >
                  {singleMut.isPending ? <Spinner size="sm" /> : 'Run'}
                </Button>
              </div>
            </div>
          ) : null}

          {mode === 'paste' ? (
            <div className="card mb-3">
              <div className="card-body">
                <p className="small text-muted mb-2">
                  Paste CSV with a header row. Columns: <code>{bulkColumnsHint(bulkKind)}</code>
                </p>
                <textarea
                  className="form-control mb-2 font-monospace"
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={sampleCsvForTool(bulkKind)}
                  data-testid="bulk-textarea"
                />
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    onClick={() => bulkMut.mutate()}
                    disabled={bulkMut.isPending || !bulkText.trim()}
                    data-testid="run-bulk"
                  >
                    {bulkMut.isPending ? <Spinner size="sm" /> : 'Start bulk job'}
                  </Button>
                  {tab === 'gics' ? (
                    <Button
                      variant="popup-secondary"
                      onClick={() => holdingsMut.mutate()}
                      disabled={holdingsMut.isPending}
                      data-testid="classify-holdings"
                    >
                      {holdingsMut.isPending ? <Spinner size="sm" /> : 'Classify All PE Holdings'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {mode === 'upload' ? (
            <div className="card mb-3">
              <div className="card-body">
                <p className="small text-muted mb-2">
                  Upload a CSV or Excel file (.csv, .xlsx, .xls). Columns:{' '}
                  <code>{bulkColumnsHint(bulkKind)}</code>
                </p>
                <div
                  className={`border rounded p-4 mb-2 text-center ${dragOver ? 'border-primary bg-light' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    void loadBulkFile(e.dataTransfer.files?.[0]);
                  }}
                  data-testid="bulk-dropzone"
                >
                  <input
                    ref={bulkInputRef}
                    type="file"
                    accept={BULK_ACCEPT}
                    className="d-none"
                    data-testid="bulk-file-input"
                    onChange={(e) => void loadBulkFile(e.target.files?.[0])}
                  />
                  <p className="mb-2">
                    {bulkParsing ? (
                      'Parsing…'
                    ) : bulkFileName ? (
                      <>
                        <strong>{bulkFileName}</strong>
                        {' — '}
                        {bulkItems.length} row{bulkItems.length === 1 ? '' : 's'} ready
                      </>
                    ) : (
                      'Drop a file here, or choose one'
                    )}
                  </p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <Button
                      variant="standard"
                      onClick={() => bulkInputRef.current?.click()}
                      disabled={bulkParsing}
                      data-testid="bulk-choose-file"
                    >
                      Choose file
                    </Button>
                    {bulkFileName ? (
                      <Button
                        variant="popup-secondary"
                        onClick={clearBulkFile}
                        data-testid="bulk-clear-file"
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    onClick={() => bulkMut.mutate()}
                    disabled={bulkMut.isPending || bulkParsing || bulkItems.length === 0}
                    data-testid="run-bulk-upload"
                  >
                    {bulkMut.isPending ? <Spinner size="sm" /> : 'Start bulk job'}
                  </Button>
                  {tab === 'gics' ? (
                    <Button
                      variant="popup-secondary"
                      onClick={() => holdingsMut.mutate()}
                      disabled={holdingsMut.isPending}
                      data-testid="classify-holdings"
                    >
                      {holdingsMut.isPending ? <Spinner size="sm" /> : 'Classify All PE Holdings'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {lastResult && mode === 'single' ? (
            <div className="card mb-3" data-testid="result-card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Result</strong>
                  <StatusBadges
                    status={String(lastResult.status || '')}
                    confidence={
                      lastResult.confidence != null ? String(lastResult.confidence) : null
                    }
                  />
                </div>
                <ResultSummary tab={tab} row={lastResult} />
              </div>
            </div>
          ) : null}

          {mode === 'single' && recentQuery.data && Array.isArray(recentQuery.data) ? (
            <div className="table-responsive">
              <table className="table align-middle mb-0 data-tools-table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Name</th>
                    <th scope="col">Result</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuery.data.slice(0, 20).map((r, i) => {
                    const row = r as unknown as Record<string, unknown>;
                    return (
                      <tr key={String(row.id || i)}>
                        <td className="small text-muted">
                          {row.createdAt ? formatDateTimeShort(String(row.createdAt)) : '—'}
                        </td>
                        <td className="fw-medium">{resultName(row)}</td>
                        <td>
                          <ResultCell tab={tab} row={row} />
                        </td>
                        <td>
                          <StatusBadges
                            status={row.status != null ? String(row.status) : null}
                            confidence={row.confidence != null ? String(row.confidence) : null}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <div className="table-responsive mb-3">
            <table className="table align-middle mb-0 data-tools-table" data-testid="jobs-table">
              <thead>
                <tr>
                  <th scope="col" className="data-tools-col-id">
                    ID
                  </th>
                  <th scope="col" className="data-tools-col-type">
                    Type
                  </th>
                  <th scope="col" className="data-tools-col-status">
                    Status
                  </th>
                  <th scope="col" className="data-tools-col-progress">
                    Progress
                  </th>
                  <th scope="col" className="data-tools-col-created">
                    Created
                  </th>
                  <th scope="col" className="data-tools-col-actions text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(jobsQuery.data?.jobs || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No bulk jobs yet.
                    </td>
                  </tr>
                ) : (
                  (jobsQuery.data?.jobs || []).map((j) => (
                    <tr key={j.id}>
                      <td className="font-monospace small data-tools-col-id">{j.id.slice(0, 8)}</td>
                      <td className="data-tools-col-type">
                        <span className="fw-medium">{j.jobType}</span>
                      </td>
                      <td className="data-tools-col-status">
                        <Badge
                          tone={
                            j.status === 'completed'
                              ? 'info'
                              : j.status === 'failed'
                                ? 'danger'
                                : 'secondary'
                          }
                        >
                          {j.status}
                        </Badge>
                      </td>
                      <td className="small text-muted data-tools-col-progress">
                        {j.processed}/{j.total}
                        <span className="mx-1">·</span>
                        found {j.found}
                        <span className="mx-1">·</span>
                        not found {j.notFoundCount}
                        <span className="mx-1">·</span>
                        errors {j.errorCount}
                      </td>
                      <td className="small text-muted data-tools-col-created">
                        {j.createdAt ? formatDateTimeShort(j.createdAt) : '—'}
                      </td>
                      <td className="text-end data-tools-col-actions">
                        <div className="data-tools-row-actions">
                          <Button variant="popup-secondary" onClick={() => setResultsJobId(j.id)}>
                            Results
                          </Button>
                          <Button variant="popup-secondary" onClick={() => void downloadJobCsv(j)}>
                            CSV
                          </Button>
                          {j.status === 'failed' && j.total > j.processed ? (
                            <Button
                              variant="standard"
                              data-testid={`resume-${j.id}`}
                              onClick={() => resumeMut.mutate(j.id)}
                            >
                              Resume
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {resultsJobId ? (
            <div className="card" data-testid="results-drawer">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Results · {resultsJobId.slice(0, 8)}</span>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setResultsJobId(null)}
                />
              </div>
              <div className="card-body p-0">
                {(() => {
                  const job = (jobsQuery.data?.jobs || []).find((j) => j.id === resultsJobId);
                  const resultTab = jobTypeToTab(job?.jobType || 'url_lookup');
                  const rows = resultsQuery.data?.results ?? [];
                  if (resultsQuery.isLoading) {
                    return (
                      <div className="p-3 text-muted small">
                        <Spinner size="sm" /> Loading results…
                      </div>
                    );
                  }
                  if (rows.length === 0) {
                    return <div className="p-3 text-muted small">No results for this job.</div>;
                  }
                  return (
                    <div className="table-responsive data-tools-results-scroll">
                      <table className="table align-middle mb-0 data-tools-table">
                        <thead>
                          <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Result</th>
                            <th scope="col">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => {
                            const row = r as Record<string, unknown>;
                            return (
                              <tr key={String(row.id || i)}>
                                <td className="fw-medium">{resultName(row)}</td>
                                <td>
                                  <ResultCell tab={resultTab} row={row} />
                                </td>
                                <td>
                                  <StatusBadges
                                    status={row.status != null ? String(row.status) : null}
                                    confidence={
                                      row.confidence != null ? String(row.confidence) : null
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
