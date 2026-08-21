// SummaryPage — pixel port of quralyst_research/summary.html ("List Data Summary").
// Criteria card + match-summary line + Overview/Distribution/Contacts tabs. Top Locations is an
// ApexCharts bar chart; State/Employee/Revenue distributions are template tables; contact metrics
// are the template's custom CSS progress bars (NOT charts). Data via resultsService.getSummary.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { resultsService } from '@/services/api';
import type { SummaryResponse } from '@/services/api/resultsService';
import { Spinner, BaseTable } from '@/components/ui';
import QueryError from '@/components/feedback/QueryError';
import { useThemeTokens } from '@/hooks/useThemeTokens';
import '@/styles/pages/summary.css';

type TabId = 'overview' | 'distribution' | 'contacts';

// Locale-grouped integer ("11" → "11", "12345" → "12,345"); mirrors Jinja "{:,}".format.
function formatInt(n: number): string {
  return n.toLocaleString('en-US');
}

// Whole-percent of part over total, clamped to [0, 100]; matches the template's |int math.
function pctInt(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.trunc((part / total) * 100);
}

// One-decimal percent string for the captions; matches the template's |round(1).
function pctRounded(part: number, total: number): string {
  if (total <= 0) return '0';
  return (Math.round((part / total) * 1000) / 10).toString();
}

interface ProgressBarsProps {
  value: number;
  total: number;
}

// The dual-segment custom progress bar (filled + dark remainder) reused by every contact metric.
function ProgressBars({ value, total }: ProgressBarsProps) {
  const filled = pctInt(value, total);
  const remainder = total > 0 ? 100 - filled : 100;
  return (
    <div className="progress progress-custom mb-2">
      <div
        className="progress-bar progress-bar-custom"
        role="progressbar"
        style={{ width: `${filled}%` }}
      />
      <div
        className="progress-bar progress-bar-custom-dark"
        role="progressbar"
        style={{ width: `${remainder}%` }}
      />
    </div>
  );
}

interface ContactStatCardProps {
  icon: string;
  alt: string;
  title: string;
  value: number;
  total: number;
  caption: string;
}

// A Contacts-tab stat card: icon + title, "value / total", progress bar, percent caption.
function ContactStatCard({ icon, alt, title, value, total, caption }: ContactStatCardProps) {
  return (
    <div className="col-lg-5 mb-3">
      <div className="criteria-card criteria-card--white h-100">
        <div className="d-flex align-items-center mb-3">
          <img src={`/images/data_summary/${icon}`} alt={alt} className="icon-summary" />
          <div className="card-title mb-0">{title}</div>
        </div>
        <div className="mb-2">
          <span className="fw-bold text-dark">{formatInt(value)}</span>
          <span className="text-muted"> / {formatInt(total)}</span>
        </div>
        <ProgressBars value={value} total={total} />
        <small className="text-muted">
          {pctRounded(value, total)}% {caption}
        </small>
      </div>
    </div>
  );
}

interface SummaryStatsLike {
  topCountryName: string;
  stateDistribution: { name: string; count: number; percentage: number }[];
}

// Shared "<country> State Distribution" card (used by both Overview and Distribution tabs).
function StateDistributionCard({ stats }: { stats: SummaryStatsLike }) {
  const states = stats.stateDistribution.slice(0, 5);
  return (
    <div className="col-lg-5 mb-3">
      <div className="criteria-card criteria-card--white h-100">
        <div className="card-title">{stats.topCountryName} State Distribution</div>
        <div className="state-list">
          {states.length > 0 ? (
            <BaseTable
              borderless
              compact
              columns={[
                {
                  key: 'dot',
                  header: '',
                  align: 'center',
                  render: () => <span className="state-dot" />,
                },
                {
                  key: 'name',
                  header: 'State',
                  render: (state) => <span className="state-name">{state.name}</span>,
                },
                {
                  key: 'count',
                  header: 'Count',
                  align: 'center',
                  render: (state) => <span className="state-value">{state.count}</span>,
                },
                {
                  key: 'percentage',
                  header: '%',
                  align: 'center',
                  render: (state) => <span className="state-value">{state.percentage}%</span>,
                },
              ]}
              rows={states}
              getRowKey={(s) => s.name}
            />
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5">
              <div className="rounded-circle bg-light p-3 mb-3">
                <i className="bi bi-geo-alt text-muted fs-4" />
              </div>
              <p className="text-muted mb-0">No state data available for {stats.topCountryName}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmployeeTableProps {
  rows: { range: string; companies: number; percentage: number }[];
  companiesHeader: string;
  percentHeader: string;
}

// Employee Size Distribution table.
function EmployeeSizeTable({ rows, companiesHeader, percentHeader }: EmployeeTableProps) {
  return (
    <div className="col-lg-6 mb-3">
      <div className="criteria-card criteria-card--white h-100">
        <div className="card-title">Employee Size Distribution</div>
        <BaseTable
          borderless
          compact
          columns={[
            {
              key: 'index',
              header: '#',
              headerClass: 'index-col',
              cellClass: 'index-col',
              render: (_, i) => String(i + 1).padStart(2, '0'),
            },
            {
              key: 'range',
              header: 'Range',
              headerClass: 'range-col',
              cellClass: 'range-col',
              render: (item) => item.range,
            },
            {
              key: 'companies',
              header: companiesHeader,
              headerClass: 'companies-col companies-header',
              cellClass: 'companies-col',
              render: (item) => item.companies,
            },
            {
              key: 'percentage',
              header: percentHeader,
              headerClass: 'percentage-col',
              cellClass: 'percentage-col',
              render: (item) => (
                <div className="percentage-wrapper">
                  <div className="progress progress-table" role="progressbar">
                    <div
                      className="progress-bar progress-bar-custom"
                      style={{ width: `${item.percentage}%` }}
                    />
                    <div
                      className="progress-bar progress-bar-custom-dark"
                      style={{ width: `${100 - item.percentage}%` }}
                    />
                  </div>
                  <span className="percentage-value">{item.percentage}%</span>
                </div>
              ),
            },
          ]}
          rows={rows}
          getRowKey={(item) => item.range}
        />
      </div>
    </div>
  );
}

// Revenue Range Distribution table.
function RevenueRangeTable({
  rows,
}: {
  rows: { range: string; companies: number; percentage: number }[];
}) {
  return (
    <div className="col-lg-6 mb-3">
      <div className="criteria-card criteria-card--white h-100">
        <div className="card-title">Revenue Range Distribution</div>
        <BaseTable
          borderless
          compact
          columns={[
            {
              key: 'range',
              header: 'Range',
              cellClass: 'revenue-range-text',
              render: (item) => item.range,
            },
            {
              key: 'companies',
              header: 'Companies %',
              render: (item) => (
                <>
                  <span className="revenue-count">{item.companies}</span>
                  <div className="percentage-wrapper d-inline-flex ms-2">
                    <div className="progress progress-table" role="progressbar">
                      <div
                        className="progress-bar progress-bar-custom"
                        style={{ width: `${item.percentage}%` }}
                      />
                      <div
                        className="progress-bar progress-bar-custom-dark"
                        style={{ width: `${100 - item.percentage}%` }}
                      />
                    </div>
                    <span className="percentage-value ms-2">{item.percentage}%</span>
                  </div>
                </>
              ),
            },
          ]}
          rows={rows}
          getRowKey={(item) => item.range}
        />
      </div>
    </div>
  );
}

export default function SummaryPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { tokens, isDark } = useThemeTokens();

  useEffect(() => {
    if (!resultId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    resultsService
      .getSummary(resultId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resultId, reloadKey]);

  if (error) {
    return (
      <div className="summary-page">
        <QueryError onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="summary-page d-flex justify-content-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const { stats, criteriaList } = data;
  const fitCount = stats.fitsCount + stats.partialFitsCount;

  // Top Locations bar chart — ports the legacy #topLocationsChartOverview ApexCharts config verbatim.
  const locationNames = stats.topLocations.map((item) => item.name);
  const locationCounts = stats.topLocations.map((item) => item.count);
  const chartSeries = [{ name: 'Companies', data: locationCounts }];
  // ApexCharts options are JS, not CSS, so they can't read theme tokens — useThemeTokens() reads the
  // live computed values (axis = secondary text, grid = the app-wide border, fill = brand secondary).
  const axisColor = tokens['--color-text-secondary'];
  const gridColor = tokens['--border-subtle'];
  const chartOptions: ApexOptions = {
    chart: { type: 'bar', height: 250, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '40%', distributed: false } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: locationNames,
      labels: { style: { colors: axisColor, fontSize: '12px' } },
    },
    yaxis: { labels: { style: { colors: axisColor } } },
    fill: { colors: [tokens['--color-secondary']] },
    grid: { borderColor: gridColor },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  const TopLocationsCard = (
    <div className="col-lg-7 mb-3">
      <div className="criteria-card criteria-card--white h-100">
        <div className="card-title">Top Locations</div>
        <div className="chart-container">
          <Chart type="bar" height={250} options={chartOptions} series={chartSeries} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="summary-page">
      {/* Criteria Card (Always Visible) */}
      <div className="criteria-card criteria-card--white mb-4">
        <div className="card-title">Criteria Used</div>
        <div className="criteria-text">
          {criteriaList.length > 0 ? criteriaList.join(', ') : 'No specific criteria recorded.'}
        </div>
      </div>

      {/* Match Summary Text (Outside Card) */}
      <div className="match-summary-text mb-4">
        <strong>{formatInt(fitCount)}</strong> companies matched your criteria out of{' '}
        <strong>{formatInt(stats.totalInputRecords)}</strong> list of companies you shared.
        <br />
        <small>
          This snapshot provides key trends and distributions to help you prioritize outreach and
          identify patterns in the market landscape.
        </small>
      </div>

      {/* Tabs Navigation */}
      <ul className="nav nav-tabs mb-4" id="summaryTabs" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link${activeTab === 'overview' ? ' active' : ''}`}
            id="overview-tab"
            type="button"
            role="tab"
            aria-controls="overview"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link${activeTab === 'distribution' ? ' active' : ''}`}
            id="distribution-tab"
            type="button"
            role="tab"
            aria-controls="distribution"
            aria-selected={activeTab === 'distribution'}
            onClick={() => setActiveTab('distribution')}
          >
            Distribution
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link${activeTab === 'contacts' ? ' active' : ''}`}
            id="contacts-tab"
            type="button"
            role="tab"
            aria-controls="contacts"
            aria-selected={activeTab === 'contacts'}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts
          </button>
        </li>
      </ul>

      {/* Tabs Content */}
      <div className="tab-content" id="summaryTabsContent">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div
            className="tab-pane fade show active"
            id="overview"
            role="tabpanel"
            aria-labelledby="overview-tab"
          >
            <div className="row g-3 mb-3">
              {TopLocationsCard}
              <StateDistributionCard stats={stats} />
            </div>

            {/* Contacts Section in Overview */}
            <div className="row g-3 justify-content-between mb-3">
              <div className="col-lg-5 mb-3">
                <div className="criteria-card criteria-card--white h-100">
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src="/images/data_summary/Icon (1).png"
                      alt="Phone"
                      className="icon-summary"
                    />
                    <div className="card-title mb-0">Contact Numbers Available</div>
                  </div>
                  <div className="contact-stat-item mb-0">
                    <div className="mb-2">
                      <span className="fw-bold text-dark">{stats.companiesWithPhone}</span>
                      <span className="text-muted"> / {stats.totalMatches}</span>
                    </div>
                    <ProgressBars value={stats.companiesWithPhone} total={stats.totalMatches} />
                    <small className="text-muted">
                      {pctRounded(stats.companiesWithPhone, stats.totalMatches)}% Companies with
                      direct phone number
                    </small>
                  </div>
                </div>
              </div>

              <div className="col-lg-5 mb-3">
                <div className="criteria-card criteria-card--white h-100">
                  <div className="d-flex align-items-center mb-3">
                    <img src="/images/data_summary/Icon.png" alt="Email" className="icon-summary" />
                    <div className="card-title mb-0">Email Addresses Available</div>
                  </div>
                  <div className="contact-stat-item mb-0">
                    <div className="mb-2">
                      <span className="fw-bold text-dark">{stats.companiesWithEmail}</span>
                      <span className="text-muted"> / {stats.totalMatches}</span>
                    </div>
                    <ProgressBars value={stats.companiesWithEmail} total={stats.totalMatches} />
                    <small className="text-muted">
                      {pctRounded(stats.companiesWithEmail, stats.totalMatches)}% Companies with
                      verified email contacts
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution Section in Overview */}
            <div className="row g-3">
              <EmployeeSizeTable
                rows={stats.employeeDistribution}
                companiesHeader="Count"
                percentHeader="Companies %"
              />
              <RevenueRangeTable rows={stats.revenueDistribution} />
            </div>
          </div>
        )}

        {/* Distribution Tab */}
        {activeTab === 'distribution' && (
          <div
            className="tab-pane fade show active"
            id="distribution"
            role="tabpanel"
            aria-labelledby="distribution-tab"
          >
            <div className="row g-3 justify-content-between mb-3">
              {TopLocationsCard}
              <StateDistributionCard stats={stats} />
            </div>

            <div className="row g-3">
              <EmployeeSizeTable
                rows={stats.employeeDistribution}
                companiesHeader="Companies"
                percentHeader="%"
              />
              <RevenueRangeTable rows={stats.revenueDistribution} />
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div
            className="tab-pane fade show active"
            id="contacts"
            role="tabpanel"
            aria-labelledby="contacts-tab"
          >
            {/* Top Stats Section */}
            <div className="row g-3 mb-3 justify-content-between">
              <ContactStatCard
                icon="Icon (1).png"
                alt="Phone"
                title="Contact Numbers Available"
                value={stats.companiesWithPhone}
                total={stats.totalMatches}
                caption="Companies with direct phone number"
              />
              <ContactStatCard
                icon="Icon.png"
                alt="Email"
                title="Email Addresses Available"
                value={stats.companiesWithEmail}
                total={stats.totalMatches}
                caption="Companies with verified email contacts"
              />
              <ContactStatCard
                icon="Icon (2).png"
                alt="Address"
                title="Complete Addresses"
                value={stats.companiesWithAddress}
                total={stats.totalMatches}
                caption="Companies with full address information"
              />
              <ContactStatCard
                icon="Icon (3).png"
                alt="Executive"
                title="Executive Contacts"
                value={stats.companiesWithExecutive}
                total={stats.totalMatches}
                caption="Companies with C-level contact information"
              />
            </div>

            {/* Contacts Table */}
            <div className="criteria-card criteria-card--white p-0 overflow-hidden">
              <div className="table-responsive contacts-table-responsive">
                <table className="table table-hover mb-0 contacts-table">
                  <colgroup>
                    <col className="col-width-24" />
                    <col className="col-width-18" />
                    <col className="col-width-18" />
                    <col className="col-width-20" />
                    <col className="col-width-20" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border-0">Company Name</th>
                      <th className="border-0">Contact First Name</th>
                      <th className="border-0">Contact Last Name</th>
                      <th className="border-0">Company Phone Number</th>
                      <th className="border-0">Contact Emails</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No contact data available.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
