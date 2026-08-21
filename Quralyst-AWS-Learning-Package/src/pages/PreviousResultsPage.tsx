// PreviousResultsPage — Replit-parity Previous Results Page with collapsible filters
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, Spinner } from '@/components/ui';
import QueryError from '@/components/feedback/QueryError';
import { resultsService, peTearsheetService } from '@/services/api';
import type { FiltersApplied, ResultSummary, ResultTab, TearsheetSummary } from '@/types';
import type { ResultsPagination, ResultUser } from '@/services/api/resultsService';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import '@/styles/pages/previous-results-replit.css';

const TIME_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'Last Year' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

type CheckGroup = 'common' | 'tl-sb' | 'fv';
interface CheckDef {
  id: string;
  value: string;
  label: string;
  group: CheckGroup;
}

const APPLIED_FILTER_CHECKS: CheckDef[] = [
  {
    id: 'filter_business_query',
    value: 'has_business_query',
    label: 'Business Query',
    group: 'common',
  },
  {
    id: 'filter_custom_insights',
    value: 'has_custom_insights',
    label: 'Custom Insights',
    group: 'tl-sb',
  },
  {
    id: 'filter_current_portfolio',
    value: 'has_current_portfolio',
    label: 'Current Portfolio',
    group: 'fv',
  },
  {
    id: 'filter_past_portfolio',
    value: 'has_past_portfolio',
    label: 'Past Portfolio',
    group: 'fv',
  },
  {
    id: 'filter_listed_interest',
    value: 'has_listed_interest',
    label: 'Listed Interest',
    group: 'fv',
  },
  { id: 'filter_industry', value: 'has_industry', label: 'Industry', group: 'common' },
  { id: 'filter_geography', value: 'has_geography', label: 'Geography', group: 'common' },
  { id: 'filter_revenue', value: 'has_revenue', label: 'Revenue', group: 'tl-sb' },
  { id: 'filter_employees', value: 'has_employees', label: 'Employees', group: 'tl-sb' },
  {
    id: 'filter_primary_activity',
    value: 'has_primary_activity',
    label: 'Primary Activity',
    group: 'tl-sb',
  },
  {
    id: 'filter_secondary_activity',
    value: 'has_secondary_activity',
    label: 'Secondary Activity',
    group: 'tl-sb',
  },
  {
    id: 'filter_primary_business_only',
    value: 'has_primary_business_only',
    label: 'Primary Business Only',
    group: 'tl-sb',
  },
  {
    id: 'filter_apollo_enrichment',
    value: 'has_apollo_enrichment',
    label: 'Apollo Enrichment',
    group: 'tl-sb',
  },
  {
    id: 'filter_news_enrichment',
    value: 'has_news_enrichment',
    label: 'News Enrichment',
    group: 'tl-sb',
  },
];

const DATA_SOURCE_CHECKS: CheckDef[] = [
  {
    id: 'filter_apollo_search',
    value: 'has_apollo_search',
    label: 'Apollo Search',
    group: 'tl-sb',
  },
  { id: 'filter_gmaps_search', value: 'has_gmaps_search', label: 'GMaps Search', group: 'tl-sb' },
  {
    id: 'filter_coresignal_search',
    value: 'has_coresignal_search',
    label: 'Coresignal Search',
    group: 'tl-sb',
  },
];

const TABS: {
  tabType: ResultTab;
  id: string;
  label: string;
  buildPath?: string;
  emptyMode?: string;
}[] = [
  {
    tabType: 'target-list',
    id: 'target-list-tab',
    label: 'Target lists',
    buildPath: paths.targetList,
    emptyMode: 'target list',
  },
  {
    tabType: 'strategic-buyer',
    id: 'strategic-buyer-tab',
    label: 'Strategic',
    buildPath: paths.strategic,
    emptyMode: 'strategic buyer list',
  },
  {
    tabType: 'fv-results',
    id: 'fv-results-tab',
    label: 'Financials',
    buildPath: paths.financialVerticals,
    emptyMode: 'financials buyer list',
  },
  { tabType: 'tearsheets', id: 'tearsheets-tab', label: 'Tearsheets' },
];

const VALID_TABS: ResultTab[] = ['target-list', 'strategic-buyer', 'fv-results', 'tearsheets'];

type NumberLike = number | string;

interface ReusableFilters extends FiltersApplied {
  business_queries?: string[];
  industry_pairs?: { industry: string; subIndustry?: string }[];
  location_groups?: { continent?: string; country?: string; state?: string; city?: string }[];
  custom_insights?: { questions?: string[] };
  llm_providers?: string[] | null;
  primary_activity?: string;
  secondary_activity?: string;
  min_revenue?: NumberLike;
  max_revenue?: NumberLike;
  min_employees?: NumberLike;
  max_employees?: NumberLike;
  size_criteria_logic?: string;
  use_news?: boolean;
  use_apollo?: boolean;
  enable_linkedin_enrichment?: boolean;
  ownership_enrichment?: boolean;
  acquisition_enrichment?: boolean;
  blank_field_backfill?: boolean;
  blankFieldBackfill?: boolean;
  llm_fallback_enabled?: boolean;
  targetDescription?: string;
  target_description?: string;
  businessType?: string;
  business_type?: string;
  sub_industry?: string;
  continent?: string;
  country?: string;
  state?: string;
  size?: {
    revenueMin?: NumberLike;
    revenueMax?: NumberLike;
    ebitdaMin?: NumberLike;
    ebitdaMax?: NumberLike;
  };
  exposure?: {
    currentPortfolio?: boolean;
    pastPortfolio?: boolean;
    listedInterest?: boolean;
  };
  ebitdaMin?: NumberLike;
  ebitdaMax?: NumberLike;
  equityCheckMin?: NumberLike;
  equityCheckMax?: NumberLike;
  enterpriseValueMin?: NumberLike;
  enterpriseValueMax?: NumberLike;
  // F67 — the backend persists both: `platform_floors` is what was applied (defaults
  // filled in), `platform_floors_raw` is what was typed. Reruns read the raw pair so
  // blanks stay blank. Both casings are accepted; the envelope may camelCase them.
  platformFloorsRaw?: { ebitda?: NumberLike; revenue?: NumberLike };
  platform_floors_raw?: { ebitda?: NumberLike; revenue?: NumberLike };
  platformFloors?: { ebitda?: NumberLike; revenue?: NumberLike };
  currentPortfolio?: boolean;
  pastPortfolio?: boolean;
  listedInterest?: boolean;
  autoEnrich?: boolean;
  requestPeContact?: boolean;
  requestContact?: boolean;
}

type LegacyResultSummary = ResultSummary & { filters_applied?: ReusableFilters };

function parseTab(raw: string | null): ResultTab {
  return raw && (VALID_TABS as string[]).includes(raw) ? (raw as ResultTab) : 'target-list';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusVariant(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'complete') return 'bg-status-success';
  if (s === 'error' || s === 'failed' || s.includes('cancelled')) return 'bg-status-error';
  if (
    s === 'processing' ||
    s === 'running' ||
    s === 'pending' ||
    s === 'researching' ||
    s === 'synthesizing'
  )
    return 'bg-status-pending';
  return 'bg-status-default';
}

function statusLabel(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  if (s === 'complete' || s === 'completed') return 'Completed';
  if (s === 'researching') return 'Researching';
  if (s === 'synthesizing') return 'Synthesizing';
  if (s === 'pending') return 'Pending';
  if (s === 'failed' || s === 'error') return 'Failed';
  if (s.includes('cancelled_by_user')) return 'Cancelled by user';
  return status || 'Unknown';
}

export default function PreviousResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const activeTab = parseTab(searchParams.get('active_tab'));
  const activeTabDef = TABS.find((t) => t.tabType === activeTab)!;

  // Server-side filter form state (seeded from URL for deep links / refresh).
  const [timeRange, setTimeRange] = useState(searchParams.get('time_range') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'newest');
  const [userFilter, setUserFilter] = useState(searchParams.get('user_filter') || 'all');
  const [filenameSearch, setFilenameSearch] = useState(searchParams.get('filename_search') || '');
  const [selectedFilters, setSelectedFilters] = useState<string[]>(
    searchParams.getAll('filter_type'),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<ResultUser[]>([]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [tearsheets, setTearsheets] = useState<TearsheetSummary[]>([]);
  const [pagination, setPagination] = useState<ResultsPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const page = Number(searchParams.get('page') || '1') || 1;
  const reqIdRef = useRef(0);

  const userOptions = useMemo(
    () => [
      { value: 'all', label: 'All Users' },
      { value: 'me', label: 'My Results Only' },
      ...users.map((u) => ({ value: u.id, label: u.fullName })),
    ],
    [users],
  );

  const appliedFilterCount = useMemo(() => {
    let n = selectedFilters.length;
    if (timeRange !== 'all') n += 1;
    if (sortBy !== 'newest') n += 1;
    if (userFilter !== 'all') n += 1;
    if (filenameSearch.trim()) n += 1;
    return n;
  }, [selectedFilters, timeRange, sortBy, userFilter, filenameSearch]);

  useEffect(() => {
    let cancelled = false;
    resultsService
      .listUsers()
      .then((res) => {
        if (!cancelled && res.success) setUsers(res.users);
      })
      .catch(() => {
        /* non-fatal — dropdown just won't list extra users */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setLoadError(false);

    if (activeTab === 'tearsheets') {
      peTearsheetService
        .list()
        .then((rows) => {
          if (reqId !== reqIdRef.current) return;
          setTearsheets(rows ?? []);
          setResults([]);
          setPagination(null);
        })
        .catch(() => {
          if (reqId !== reqIdRef.current) return;
          setTearsheets([]);
          setLoadError(true);
        })
        .finally(() => {
          if (reqId === reqIdRef.current) setLoading(false);
        });
      return;
    }

    const filenameParam = searchParams.get('filename_search') || undefined;
    resultsService
      .list(activeTab, {
        page,
        timeRange: searchParams.get('time_range') || 'all',
        sortBy: searchParams.get('sort_by') || 'newest',
        userFilter: searchParams.get('user_filter') || 'all',
        filenameSearch: activeTab !== 'fv-results' ? filenameParam : undefined,
        filterType: searchParams.getAll('filter_type'),
      })
      .then((data) => {
        if (reqId !== reqIdRef.current) return;
        if (data.success) {
          setResults(data.results);
          setPagination(data.pagination);
          setTearsheets([]);
        } else {
          setResults([]);
          setPagination(null);
        }
      })
      .catch(() => {
        if (reqId !== reqIdRef.current) return;
        setResults([]);
        setPagination(null);
        setLoadError(true);
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false);
      });
  }, [activeTab, page, searchParams]);

  const commitToUrl = useCallback(
    (tab: ResultTab, nextPage: number, overrides?: { reset?: boolean }) => {
      const next = new URLSearchParams();
      next.set('active_tab', tab);
      next.set('page', String(nextPage));
      if (overrides?.reset) {
        if (searchQuery.trim()) next.set('search', searchQuery.trim());
        setSearchParams(next);
        return;
      }
      if (timeRange && timeRange !== 'all') next.set('time_range', timeRange);
      if (sortBy && sortBy !== 'newest') next.set('sort_by', sortBy);
      if (userFilter && userFilter !== 'all') next.set('user_filter', userFilter);
      if (filenameSearch.trim() && tab !== 'fv-results' && tab !== 'tearsheets') {
        next.set('filename_search', filenameSearch.trim());
      }
      selectedFilters.forEach((f) => next.append('filter_type', f));
      if (searchQuery.trim()) next.set('search', searchQuery.trim());
      setSearchParams(next);
    },
    [timeRange, sortBy, userFilter, filenameSearch, selectedFilters, searchQuery, setSearchParams],
  );

  // Sync search state when URL changes, mainly for deep links/back button
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setTimeRange(searchParams.get('time_range') || 'all');
    setSortBy(searchParams.get('sort_by') || 'newest');
    setUserFilter(searchParams.get('user_filter') || 'all');
    setFilenameSearch(searchParams.get('filename_search') || '');
    setSelectedFilters(searchParams.getAll('filter_type'));
  }, [searchParams]);

  // Handle enter key in search
  const handleSearchKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitToUrl(activeTab, 1);
    }
  };

  const switchTab = (tab: ResultTab) => {
    if (tab === activeTab) return;
    setSearchQuery('');
    setSelectedFilters([]);
    setFilenameSearch('');
    setShowFilters(false);
    const next = new URLSearchParams();
    next.set('active_tab', tab);
    next.set('page', '1');
    if (timeRange && timeRange !== 'all') next.set('time_range', timeRange);
    if (sortBy && sortBy !== 'newest') next.set('sort_by', sortBy);
    if (userFilter && userFilter !== 'all') next.set('user_filter', userFilter);
    setSearchParams(next);
  };

  const applyFilters = () => commitToUrl(activeTab, 1);

  const resetFilters = () => {
    setTimeRange('all');
    setSortBy('newest');
    setUserFilter('all');
    setFilenameSearch('');
    setSelectedFilters([]);
    commitToUrl(activeTab, 1, { reset: true });
  };

  const changePage = (nextPage: number) => commitToUrl(activeTab, nextPage);

  const toggleCheckbox = (value: string, checked: boolean) => {
    setSelectedFilters((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
  };

  const renderCheck = (def: CheckDef) => {
    const groupClass =
      def.group === 'tl-sb' ? ' filter-group-tl-sb' : def.group === 'fv' ? ' filter-group-fv' : '';
    return (
      <div className={`rep-pr-check${groupClass}`} key={def.id}>
        <input
          className="form-check-input"
          type="checkbox"
          id={def.id}
          name="filter_type"
          value={def.value}
          checked={selectedFilters.includes(def.value)}
          onChange={(e) => toggleCheckbox(def.value, e.target.checked)}
        />
        <label className="form-check-label" htmlFor={def.id}>
          {def.label}
        </label>
      </div>
    );
  };

  const reuseSettings = (result: ResultSummary, mode: ResultTab) => {
    const legacyResult = result as LegacyResultSummary;
    const filters =
      (result.filtersApplied as ReusableFilters | undefined) ?? legacyResult.filters_applied ?? {};
    // Depending on backend shape, sometimes filters are camelCase, sometimes snake_case

    if (mode === 'target-list' || mode === 'strategic-buyer') {
      const bQueries = filters.businessQueries || filters.business_queries || [];
      const indPairs = filters.industryPairs || filters.industry_pairs || [];
      const locGroups = filters.locationGroups || filters.location_groups || [];
      const cInsights = filters.customInsights || filters.custom_insights || {};
      const llmProv = filters.llmProviders || filters.llm_providers || null;

      const draft = {
        businessQuery: bQueries.length
          ? bQueries.map((q: string) => ({ value: q }))
          : [{ value: '' }],
        targetDescription: bQueries.length ? bQueries.join('\\n\\n') : '', // For some versions of strategic
        industry: indPairs[0]?.industry || '',
        subIndustry: indPairs[0]?.subIndustry || '',
        primaryActivity: filters.primaryActivity || filters.primary_activity || '',
        secondaryActivity: filters.secondaryActivity || filters.secondary_activity || '',
        size: {
          minRevenue: filters.minRevenue?.toString() || filters.min_revenue?.toString() || '',
          maxRevenue: filters.maxRevenue?.toString() || filters.max_revenue?.toString() || '',
          minEmployees: filters.minEmployees?.toString() || filters.min_employees?.toString() || '',
          maxEmployees: filters.maxEmployees?.toString() || filters.max_employees?.toString() || '',
          sizeCriteriaLogic:
            filters.sizeCriteriaLogic ||
            filters.size_criteria_logic ||
            filters.sizeMatchLogic ||
            'AND',
        },
        geography: locGroups.length
          ? locGroups
          : [{ continent: '', country: '', state: '', city: '' }],
        customInsights: {
          scrapingPath: mode === 'target-list' ? 'target_list' : 'strategic',
          questions: cInsights.questions?.length
            ? cInsights.questions.map((q: string) => ({ value: q }))
            : [{ value: '' }],
          useCompanySizeInsight: false,
        },
        enrichment: {
          useNews: filters.useNews || filters.use_news || false,
          useApollo: filters.useApollo || filters.use_apollo || false,
          enableLinkedinEnrichment:
            filters.enableLinkedinEnrichment || filters.enable_linkedin_enrichment || false,
          ownershipEnrichment: filters.ownershipEnrichment || filters.ownership_enrichment || false,
          acquisitionEnrichment:
            filters.acquisitionEnrichment || filters.acquisition_enrichment || false,
          blankFieldBackfill: filters.blankFieldBackfill || filters.blank_field_backfill || false,
          acquisitionTargetReadiness: false,
          sellSideMandateReadiness: false,
        },
        llm: {
          useDefault: !llmProv,
          providers: {
            openai: llmProv?.includes('openai') ?? true,
            anthropic: llmProv?.includes('anthropic') ?? true,
            google: llmProv?.includes('google') ?? true,
          },
          enableFallback: filters.llmFallbackEnabled ?? filters.llm_fallback_enabled ?? true,
        },
      };

      const key =
        mode === 'target-list' ? 'quralyst:draft:target_list' : 'quralyst:draft:strategic';
      localStorage.setItem(key, JSON.stringify(draft));
      toast.success('Settings loaded. Opening builder with these criteria.');
      navigate(mode === 'target-list' ? paths.targetList : paths.strategic);
    } else if (mode === 'fv-results') {
      // Look in nested 'size', 'exposure', 'location' blocks if FvAppliedFilters format
      const fSize = filters.size || {};
      const fExp = filters.exposure || {};
      const fLoc = filters.location || {};
      // F67: prefer the RAW floors (what the analyst typed) so blanks stay blank and
      // the composer keeps showing "Defaults ($3M / $15M)". `platform_floors` holds the
      // resolved values that were actually applied, which would prefill 3/15.
      const fFloors = filters.platformFloorsRaw || filters.platform_floors_raw || {};

      const draft = {
        targetDescription: filters.targetDescription || filters.target_description || '',
        businessType: filters.businessType || filters.business_type || '',
        industry: filters.industry || '',
        subIndustry: filters.subIndustry || filters.sub_industry || '',
        continent: filters.continent || '',
        country: fLoc.country || filters.country || '',
        state: fLoc.state || filters.state || '',
        revenueMin: fSize.revenueMin?.toString() || filters.minRevenue?.toString() || '',
        revenueMax: fSize.revenueMax?.toString() || filters.maxRevenue?.toString() || '',
        ebitdaMin: fSize.ebitdaMin?.toString() || filters.ebitdaMin?.toString() || '',
        ebitdaMax: fSize.ebitdaMax?.toString() || filters.ebitdaMax?.toString() || '',
        equityCheckMin: filters.equityCheckMin?.toString() || '',
        equityCheckMax: filters.equityCheckMax?.toString() || '',
        enterpriseValueMin: filters.enterpriseValueMin?.toString() || '',
        enterpriseValueMax: filters.enterpriseValueMax?.toString() || '',
        platformEbitdaFloor: fFloors.ebitda?.toString() || '',
        platformRevenueFloor: fFloors.revenue?.toString() || '',
        currentPortfolio: fExp.currentPortfolio ?? filters.currentPortfolio ?? false,
        pastPortfolio: fExp.pastPortfolio ?? filters.pastPortfolio ?? false,
        listedInterest: fExp.listedInterest ?? filters.listedInterest ?? false,
        autoEnrich: filters.autoEnrich ?? false,
        requestPeContact: filters.requestPeContact ?? filters.requestContact ?? false,
      };

      localStorage.setItem('quralyst:draft:financial_verticals', JSON.stringify(draft));
      toast.success('Settings loaded. Opening builder with these criteria.');
      navigate(paths.financialVerticals);
    }
  };

  const isFvTab = activeTab === 'fv-results';
  const isTsTab = activeTab === 'tearsheets';

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return results;
    return results.filter(
      (r) =>
        (r.resultFilename || '').toLowerCase().includes(q) ||
        (r.username || '').toLowerCase().includes(q),
    );
  }, [results, searchQuery]);

  const visibleTearsheets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tearsheets;
    return tearsheets.filter((t) => t.companyName.toLowerCase().includes(q));
  }, [tearsheets, searchQuery]);

  return (
    <div className={`rep-pr-page${isFvTab ? ' tab-fv-active' : ''}`}>
      <div className="rep-pr-header">
        <div>
          <h1 className="rep-pr-title">Previous Results</h1>
          <p className="rep-pr-subtitle">Lists you've built with Quralyst Research.</p>
        </div>
        <div className="rep-pr-actions">
          <button className="rep-pr-btn-outline" onClick={() => navigate(paths.scorecard)}>
            <i className="bi bi-bar-chart-line me-2" /> Scorecard
          </button>
          {activeTabDef.buildPath && (
            <button
              className="rep-pr-btn-primary"
              onClick={() => navigate(activeTabDef.buildPath!)}
            >
              <i className="bi bi-plus-lg me-2" /> New{' '}
              {activeTabDef.tabType
                .replace('-results', '')
                .replace('-list', '')
                .replace('-buyer', '')}
            </button>
          )}
        </div>
      </div>

      <div className="rep-pr-toolbar">
        <div className="rep-pr-tabs">
          {TABS.map((t) => (
            <button
              key={t.tabType}
              className={`rep-pr-tab ${activeTab === t.tabType ? 'active' : ''}`}
              onClick={() => switchTab(t.tabType)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="rep-pr-toolbar-end">
          <div className="rep-pr-search-group">
            {!isTsTab && (
              <button
                type="button"
                className={`rep-pr-btn-filters${showFilters ? ' active' : ''}`}
                onClick={() => setShowFilters((s) => !s)}
                aria-expanded={showFilters}
              >
                <i className="bi bi-funnel me-1" />
                Filters
                {appliedFilterCount > 0 && (
                  <span className="rep-pr-filter-count">{appliedFilterCount}</span>
                )}
              </button>
            )}
            <div className="rep-pr-search">
              <i className="bi bi-search search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={isTsTab ? 'Search by company...' : 'Search by name or user...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeydown}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible filter panel — hidden until Filters is clicked */}
      {!isTsTab && showFilters && (
        <div className="rep-pr-filter-panel" id="filterSortSection">
          <div className="rep-pr-filter-grid">
            <div className="rep-pr-filter-field">
              <label
                className="rep-pr-filter-label"
                htmlFor="pr-time-range"
                id="pr-time-range-label"
              >
                <i className="bi bi-calendar-range me-1" />
                Time Range
              </label>
              <Select
                id="pr-time-range"
                aria-labelledby="pr-time-range-label"
                value={timeRange}
                onChange={setTimeRange}
                options={TIME_RANGE_OPTIONS}
              />
            </div>
            <div className="rep-pr-filter-field">
              <label className="rep-pr-filter-label" htmlFor="pr-sort-by" id="pr-sort-by-label">
                <i className="bi bi-sort-down me-1" />
                Sort By Date
              </label>
              <Select
                id="pr-sort-by"
                aria-labelledby="pr-sort-by-label"
                value={sortBy}
                onChange={setSortBy}
                options={SORT_OPTIONS}
              />
            </div>
            <div className="rep-pr-filter-field">
              <label
                className="rep-pr-filter-label"
                htmlFor="pr-user-filter"
                id="pr-user-filter-label"
              >
                <i className="bi bi-person me-1" />
                Filter By User
              </label>
              <Select
                id="pr-user-filter"
                aria-labelledby="pr-user-filter-label"
                value={userFilter}
                onChange={setUserFilter}
                options={userOptions}
              />
            </div>
            {!isFvTab && (
              <div className="rep-pr-filter-field filename-search-group">
                <label className="rep-pr-filter-label" htmlFor="filenameSearch">
                  <i className="bi bi-search me-1" />
                  Search by Filename
                </label>
                <input
                  type="text"
                  className="form-control rep-pr-filter-input"
                  id="filenameSearch"
                  name="filename_search"
                  placeholder="Enter filename..."
                  value={filenameSearch}
                  onChange={(e) => setFilenameSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          <div
            className="rep-pr-filter-section"
            role="group"
            aria-labelledby="pr-applied-filters-label"
          >
            <div className="rep-pr-filter-label" id="pr-applied-filters-label">
              <i className="bi bi-funnel me-1" />
              Applied Filters (can select multiple)
            </div>
            <div className="rep-pr-checkboxes">{APPLIED_FILTER_CHECKS.map(renderCheck)}</div>
          </div>

          {!isFvTab && (
            <div
              className="rep-pr-filter-section"
              role="group"
              aria-labelledby="pr-data-source-label"
            >
              <div className="rep-pr-filter-label" id="pr-data-source-label">
                <i className="bi bi-database me-1" />
                Data Source (can select multiple)
              </div>
              <div className="rep-pr-checkboxes">{DATA_SOURCE_CHECKS.map(renderCheck)}</div>
            </div>
          )}

          <div className="rep-pr-filter-actions">
            <button type="button" className="rep-pr-btn-primary" onClick={applyFilters}>
              <i className="bi bi-check-circle me-1" />
              Apply Filters
            </button>
            <button type="button" className="rep-pr-btn-outline" onClick={resetFilters}>
              <i className="bi bi-arrow-clockwise me-1" />
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="rep-pr-content">
        {loading && (
          <div className="py-5 text-center text-muted">
            <Spinner />
          </div>
        )}

        {!loading && loadError && (
          <div className="py-5 text-center">
            <QueryError onRetry={() => commitToUrl(activeTab, page)} />
          </div>
        )}

        {/* ── Tearsheets ── */}
        {!loading && !loadError && isTsTab && (
          <>
            {tearsheets.length === 0 && (
              <div className="rep-pr-empty">
                <div className="empty-icon">
                  <i className="bi bi-inbox" />
                </div>
                <h3>No tearsheets yet</h3>
                <p>Request a tearsheet from any company row in a Target or Strategic list.</p>
              </div>
            )}

            {tearsheets.length > 0 && visibleTearsheets.length === 0 && (
              <div className="rep-pr-empty">
                <div className="empty-icon">
                  <i className="bi bi-search" />
                </div>
                <h3>No matches</h3>
                <p>Try a different company name.</p>
              </div>
            )}

            {visibleTearsheets.length > 0 && (
              <div className="rep-pr-list">
                {visibleTearsheets.map((ts) => (
                  <div className="rep-pr-row group" key={ts.id}>
                    <button
                      className="row-main"
                      onClick={() =>
                        navigate(
                          `${paths.pe.tearsheet}?company=${encodeURIComponent(ts.companyName)}${
                            ts.website ? `&website=${encodeURIComponent(ts.website)}` : ''
                          }`,
                        )
                      }
                    >
                      <div className="row-icon">
                        <i className="bi bi-easel" />
                      </div>
                      <div className="row-info">
                        <p className="row-title">{ts.companyName}</p>
                        {ts.oneLiner && <p className="row-desc">{ts.oneLiner}</p>}
                        <p className="row-meta">{formatDate(ts.createdAt)}</p>
                      </div>
                      <div className="row-stats">
                        <span className={`status-badge ${statusVariant(ts.status)}`}>
                          {statusLabel(ts.status)}
                        </span>
                      </div>
                    </button>
                    <div className="row-action">
                      <button
                        className="btn-use-settings"
                        onClick={() =>
                          navigate(
                            `${paths.pe.tearsheet}?company=${encodeURIComponent(ts.companyName)}${
                              ts.website ? `&website=${encodeURIComponent(ts.website)}` : ''
                            }`,
                          )
                        }
                        title="Open tearsheet"
                      >
                        <i className="bi bi-box-arrow-up-right me-2" /> Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Lists (Target/Strategic/Financials) ── */}
        {!loading && !loadError && !isTsTab && (
          <>
            {results.length === 0 && (
              <div className="rep-pr-empty">
                <div className="empty-icon">
                  <i className="bi bi-inbox" />
                </div>
                <h3>No {activeTabDef.emptyMode} yet</h3>
                <p>Build your first one to see it here.</p>
                {activeTabDef.buildPath && (
                  <button
                    className="rep-pr-btn-primary mt-3"
                    onClick={() => navigate(activeTabDef.buildPath!)}
                  >
                    <i className="bi bi-plus-lg me-2" /> Get started
                  </button>
                )}
              </div>
            )}

            {results.length > 0 && visibleRows.length === 0 && (
              <div className="rep-pr-empty">
                <div className="empty-icon">
                  <i className="bi bi-search" />
                </div>
                <h3>No matches</h3>
                <p>Try a different name or user.</p>
              </div>
            )}

            {visibleRows.length > 0 && (
              <div className="rep-pr-list">
                {visibleRows.map((r) => {
                  const rId = isFvTab ? (r.resultId ?? r.processId) : r.processId;
                  const detailPath = isFvTab
                    ? paths.financialVerticalsResults(rId)
                    : paths.viewResult(rId);
                  const title =
                    r.resultFilename ||
                    (isFvTab
                      ? 'Financials buyer list'
                      : activeTab === 'strategic-buyer'
                        ? 'Strategic buyer list'
                        : 'Target list');

                  return (
                    <div className="rep-pr-row group" key={rId}>
                      <button className="row-main" onClick={() => navigate(detailPath)}>
                        <div className="row-icon">
                          <i className="bi bi-file-earmark-text" />
                        </div>
                        <div className="row-info">
                          <div className="d-flex align-items-center gap-2">
                            <p className="row-title">{title}</p>
                            {r.version && r.version > 1 && (
                              <span className="version-badge">v{r.version}</span>
                            )}
                          </div>
                          <p className="row-meta">
                            {formatDate(r.createdAt)} · {r.username}
                          </p>
                        </div>
                        <div className="row-stats">
                          <div className="text-end me-4">
                            <p className="stat-num">
                              {(isFvTab ? r.totalCount : r.totalMatches)?.toLocaleString() || 0}
                            </p>
                            <p className="stat-label">{isFvTab ? 'firms' : 'matches'}</p>
                          </div>
                          {r.status && (
                            <span className={`status-badge ${statusVariant(r.status)}`}>
                              {statusLabel(r.status)}
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="row-action">
                        <button
                          className="btn-use-settings"
                          onClick={() => reuseSettings(r, activeTab)}
                          title="Load these settings into the builder"
                        >
                          <i className="bi bi-sliders me-2" /> Use settings{' '}
                          <i className="bi bi-arrow-right ms-2 transition-arrow" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="rep-pr-pagination">
                <p className="pagination-text">
                  Page {pagination.page} of {pagination.totalPages} ·{' '}
                  {pagination.totalResults.toLocaleString()} total
                </p>
                <div className="pagination-controls">
                  <button
                    className="btn-page"
                    disabled={pagination.page <= 1}
                    onClick={() => changePage(Math.max(1, pagination.page - 1))}
                  >
                    <i className="bi bi-chevron-left me-1" /> Prev
                  </button>
                  <button
                    className="btn-page"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => changePage(pagination.page + 1)}
                  >
                    Next <i className="bi bi-chevron-right ms-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
