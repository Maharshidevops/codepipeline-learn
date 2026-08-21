// FilesProcessingSummary — port of the "Files Processing Summary" card + "Input Files Used" table
// from Backup/templates/quralyst_research/view_previous_result.html (lines 408-901). Stats, the
// Applied Filters grid, the Data Sourcing Options grid, and the input-files table are all driven by
// the ResultSummary metadata (filtersApplied / filesUploaded / totalMatches). In dummy mode the
// per-file row counts / matches aren't on the fixture, so those columns degrade to N/A like the
// template's fallback branch.
import type { FiltersApplied, ResultSummary } from '@/types';
import { formatLlmModelSelection } from '../formatLlmModelSelection';

interface FilesProcessingSummaryProps {
  summary: ResultSummary | null;
  resultsCount: number; // total processed rows (after scale demo)
}

function FilterRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="applied-filter-item mb-2">
      <span className="applied-filter-label">{label}</span>
      <span className="applied-filter-value">{value}</span>
    </div>
  );
}

// Enrichment rows read Enabled/Disabled; additional-search rows also surface the per-source cap.
const enabledText = (on: boolean | undefined): string => (on ? 'Enabled' : 'Disabled');
const searchText = (on: boolean | undefined, cap?: number): string =>
  on ? `Enabled${cap != null && cap > 0 ? ` (max ${cap})` : ''}` : 'Disabled';
const yesNoText = (on: boolean | undefined): string => (on ? 'Yes' : 'No');

/** Resolve a boolean filter flag — API camelCase first, legacy mock aliases second. */
function pickBool(
  filters: FiltersApplied | undefined,
  ...keys: (keyof FiltersApplied)[]
): boolean | undefined {
  for (const key of keys) {
    const v = filters?.[key];
    if (typeof v === 'boolean') return v;
  }
  return undefined;
}

function locationText(filters: FiltersApplied | undefined): React.ReactNode {
  const groups = filters?.locationGroups;
  if (!groups || groups.length === 0) return 'Not specified';
  return groups.map((group, i) => {
    const parts = [group.continent, group.country, group.state, group.city].filter(Boolean);
    return (
      <span key={i}>
        {i + 1}: [ {parts.join(', ')} ]{i < groups.length - 1 && <br />}
      </span>
    );
  });
}

export default function FilesProcessingSummary({
  summary,
  resultsCount,
}: FilesProcessingSummaryProps) {
  const filters = summary?.filtersApplied;
  const files = summary?.filesUploaded ?? [];
  const totalFiles = files.length;
  const totalMatches = summary?.totalMatches ?? resultsCount;
  const fileRecordSum = files.reduce((sum, f) => sum + (f.totalFileRecords ?? 0), 0);
  // Prefer summed upload records; fall back to matches/resultsCount like the template.
  const totalRecords = fileRecordSum > 0 ? fileRecordSum : (summary?.totalMatches ?? resultsCount);

  const industryText =
    filters?.industryPairs && filters.industryPairs.length > 0
      ? filters.industryPairs
          .map((p) => (p.subIndustry ? `${p.industry} / ${p.subIndustry}` : p.industry))
          .join('; ')
      : 'Not specified';

  const employeesText =
    filters?.minEmployees || filters?.maxEmployees
      ? `${filters?.minEmployees ?? 'Any'} - ${filters?.maxEmployees ?? 'Any'}`
      : 'Not specified';

  const revenueText =
    filters?.minRevenue || filters?.maxRevenue
      ? `${filters?.minRevenue ?? 'Any'} - ${filters?.maxRevenue ?? 'Any'}`
      : 'Not specified';

  const businessQueryText =
    filters?.businessQueries && filters.businessQueries.length > 0
      ? filters.businessQueries.join(', ')
      : 'Not specified';

  const customInsightsText =
    filters?.customInsights?.questions && filters.customInsights.questions.length > 0
      ? filters.customInsights.questions.map((q, i) => (
          <span key={i}>
            {i + 1}. {q}
            {i < filters.customInsights!.questions.length - 1 && <br />}
          </span>
        ))
      : 'Not specified';

  const sizeLogic = filters?.sizeCriteriaLogic?.trim() || filters?.sizeMatchLogic?.trim() || 'N/A';
  const acquisitionNews =
    pickBool(filters, 'useAcquisitionNews') ?? pickBool(filters, 'useNews') ?? false;

  return (
    <div className="criteria-card criteria-card--white mb-4">
      <h4 className="mb-3">
        <i className="bi bi-clipboard-data me-2" />
        Files Processing Summary
      </h4>

      {/* Stats Row */}
      <div className="processing-stats-row mb-4">
        <div className="processing-stat-item">
          <div className="processing-stat-icon processing-stat-icon--files">
            <i className="bi bi-file-earmark-spreadsheet" />
          </div>
          <div className="processing-stat-value">{totalFiles}</div>
          <div className="processing-stat-label">Total Files Processed</div>
        </div>
        <div className="processing-stat-item">
          <div className="processing-stat-icon processing-stat-icon--records">
            <i className="bi bi-search" />
          </div>
          <div className="processing-stat-value">{totalRecords}</div>
          <div className="processing-stat-label">Input Records Processed (Files)</div>
        </div>
        <div className="processing-stat-item">
          <div className="processing-stat-icon processing-stat-icon--stored">
            <i className="bi bi-hdd-stack" />
          </div>
          <div className="processing-stat-value">{resultsCount}</div>
          <div className="processing-stat-label">Total Records Processed</div>
        </div>
        <div className="processing-stat-item">
          <div className="processing-stat-icon processing-stat-icon--matches">
            <i className="bi bi-bullseye" />
          </div>
          <div className="processing-stat-value">{totalMatches}</div>
          <div className="processing-stat-label">Total Matches</div>
        </div>
      </div>

      {/* Applied Filters */}
      <div className="applied-filters-section">
        <h4 className="applied-filters-title mb-3">
          <i className="bi bi-filter me-2" />
          Applied Filters
        </h4>
        <div className="applied-filters-grid">
          <FilterRow label="Business Query:" value={businessQueryText} />
          <FilterRow label="Industry:" value={industryText} />
          <FilterRow
            label="Primary Activity:"
            value={filters?.primaryActivity ?? 'Not specified'}
          />
          <FilterRow
            label="Secondary Activity:"
            value={filters?.secondaryActivity ?? 'Not specified'}
          />
          <FilterRow label="Employees:" value={employeesText} />
          <FilterRow label="Revenue ($M):" value={revenueText} />
          <FilterRow label="Size Match Logic:" value={sizeLogic} />
          <FilterRow label="Location:" value={locationText(filters)} />
          <FilterRow
            label="Apollo Enrichment:"
            value={enabledText(pickBool(filters, 'useApollo'))}
          />
          <FilterRow label="News Enrichment:" value={enabledText(pickBool(filters, 'useNews'))} />
          <FilterRow label="Acquisition News:" value={enabledText(acquisitionNews)} />
          <FilterRow
            label="LinkedIn Enrichment:"
            value={enabledText(pickBool(filters, 'enableLinkedinEnrichment'))}
          />
          <FilterRow
            label="Ownership Enrichment:"
            value={enabledText(pickBool(filters, 'ownershipEnrichment'))}
          />
          <FilterRow
            label="Blank-field Web Backfill:"
            value={enabledText(pickBool(filters, 'blankFieldBackfill'))}
          />
          <FilterRow
            label="Acquisition Enrichment:"
            value={enabledText(pickBool(filters, 'acquisitionEnrichment'))}
          />
          <FilterRow label="Custom Insights:" value={customInsightsText} />
          <FilterRow
            label="Primary Business Only:"
            value={yesNoText(filters?.primaryBusinessOnly)}
          />
          <FilterRow
            label="Skip Website Scraping:"
            value={yesNoText(filters?.skipWebsiteScraping)}
          />
          <FilterRow label="AI Models:" value={formatLlmModelSelection(filters)} />
        </div>
      </div>

      {/* Data Sourcing Options */}
      <div className="applied-filters-section mt-4">
        <h4 className="applied-filters-title mb-3">
          <i className="bi bi-file-earmark me-2" />
          Data Sourcing Options
        </h4>
        <div className="applied-filters-grid">
          <FilterRow
            label="Files uploaded:"
            value={
              totalFiles > 0
                ? `${totalFiles} file${totalFiles > 1 ? 's' : ''} uploaded`
                : 'No files uploaded'
            }
          />
          <FilterRow
            label="Apollo Search:"
            value={searchText(pickBool(filters, 'enableApolloSearch'), filters?.apolloMaxResults)}
          />
          <FilterRow
            label="GMaps Search:"
            value={searchText(pickBool(filters, 'enableGmapsSearch'), filters?.gmapsMaxResults)}
          />
          <FilterRow
            label="Coresignal Search:"
            value={searchText(
              pickBool(filters, 'enableCoresignalSearch'),
              filters?.coresignalMaxResults,
            )}
          />
          <FilterRow
            label="LinkedIn Search:"
            value={searchText(
              pickBool(filters, 'enableLinkedinSearch'),
              filters?.linkedinMaxResults,
            )}
          />
          <FilterRow
            label="FindAll Search:"
            value={searchText(pickBool(filters, 'enableFindallSearch'), filters?.findallMaxResults)}
          />
        </div>
      </div>
    </div>
  );
}
