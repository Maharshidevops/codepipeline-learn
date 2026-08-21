// Step 3 — Review & Submit. Builds the ReviewSummary sections from the current RHF values:
// Selling Company Attributes, Ideal Buyer Type Recommendation (suggested prompt + Selected Buyers
// chips), Size & Geography, Custom Insights, Data Sources. "Generate List →" submits.
import { type ReactNode } from 'react';
import { ReviewSummary } from '@/components/wizard';
import type { StrategicForm } from '@/types';
import { formatAdditionalSearchSummary } from '@/features/research/AdditionalSearchOption';

const NONE = <span className="text-muted">Not specified</span>;

function or(value: string | undefined, fallback: ReactNode = NONE): ReactNode {
  return value && value.trim() ? value : fallback;
}

function sizeRange(min?: string, max?: string): ReactNode {
  if ((min && min.trim()) || (max && max.trim())) {
    return `${min?.trim() || '—'} to ${max?.trim() || '—'}`;
  }
  return NONE;
}

export interface Step3Props {
  values: StrategicForm;
  files: File[];
  skipWebsiteScraping: boolean;
  onEditStep: (index: number) => void;
}

export default function Step3Review({
  values,
  files,
  skipWebsiteScraping,
  onEditStep,
}: Step3Props) {
  const buyerChips: ReactNode = (() => {
    const chips: string[] = [];
    if (values.buyerHorizontal) chips.push('Horizontal Buyers');
    if (values.buyerVertical) chips.push('Vertical Buyers');
    if (values.buyerAdjacent) chips.push('Adjacent Buyers');
    if (!chips.length) return NONE;
    return (
      <span className="d-inline-flex flex-wrap gap-2">
        {chips.map((c) => (
          <span key={c} className="rounded-pill">
            {c}
          </span>
        ))}
      </span>
    );
  })();

  const geographySummary: ReactNode = (() => {
    const parts = values.geography
      .map((g) => [g.city, g.state, g.country, g.continent].filter(Boolean).join(', '))
      .filter(Boolean);
    return parts.length ? parts.join(' | ') : NONE;
  })();

  const enrichmentSources: string[] = [];
  if (values.enrichment.useNews) enrichmentSources.push('News');
  if (values.enrichment.useApollo) enrichmentSources.push('Apollo');
  if (values.enrichment.enableLinkedinEnrichment) enrichmentSources.push('LinkedIn');
  if (values.enrichment.ownershipEnrichment) enrichmentSources.push('Ownership');
  if (values.enrichment.blankFieldBackfill) enrichmentSources.push('Blank-field backfill');
  if (values.enrichment.acquisitionEnrichment) enrichmentSources.push('Acquisition');

  const additionalSearchSummary = formatAdditionalSearchSummary(values.additionalSearch);

  const userQuestions = values.customInsights.questions.map((q) => q.value.trim()).filter(Boolean);

  return (
    <>
      <div className="mb-4">
        <h2 className="criteria-title">Target List Summary</h2>
        <p className="criteria-desc">Review your criteria before generating the target list.</p>
      </div>
      <ReviewSummary
        sections={[
          {
            title: 'Selling Company Attributes',
            icon: 'bi bi-file-text',
            onEdit: () => onEditStep(0),
            rows: [
              { label: 'Company Description', value: or(values.businessQuery[0]?.value) },
              { label: 'Industry', value: or(values.industry) },
              { label: 'Sub-Industry', value: or(values.subIndustry) },
              { label: 'Primary Activity', value: or(values.primaryActivity) },
              { label: 'Secondary Activity', value: or(values.secondaryActivity) },
            ],
          },
          {
            title: 'Ideal Buyer Type Recommendation',
            icon: 'bi bi-stars',
            onEdit: () => onEditStep(0),
            rows: [
              {
                label: 'Suggested prompt tailored to your criteria',
                value: or(values.targetDescription),
              },
              { label: 'Selected Buyers', value: buyerChips },
            ],
          },
          {
            title: 'Size & Geography',
            icon: 'bi bi-rulers',
            onEdit: () => onEditStep(1),
            rows: [
              {
                label: 'Revenue',
                value: sizeRange(values.size.minRevenue, values.size.maxRevenue),
              },
              {
                label: 'No. of Employees',
                value: sizeRange(values.size.minEmployees, values.size.maxEmployees),
              },
              { label: 'Size Match Logic', value: values.size.sizeCriteriaLogic },
              { label: 'Geography', value: geographySummary },
              {
                label: 'Uploaded Files',
                value: files.length ? files.map((f) => f.name).join(', ') : 'None',
              },
            ],
          },
          {
            title: 'Custom Insights',
            icon: 'bi bi-person',
            onEdit: () => onEditStep(1),
            rows: [
              { label: 'Scraping Strategy', value: 'Strategic Paths' },
              {
                label: 'Custom Questions',
                value: userQuestions.length ? userQuestions.join(' | ') : NONE,
              },
              {
                label: 'Company Size Insight',
                value: values.customInsights.useCompanySizeInsight ? 'Enabled' : 'Disabled',
              },
            ],
          },
          {
            title: 'Data Sources',
            icon: 'bi bi-upload',
            onEdit: () => onEditStep(1),
            rows: [
              {
                label: 'Enrichment Sources',
                value: enrichmentSources.length ? enrichmentSources.join(', ') : NONE,
              },
              {
                label: 'Additional Searches',
                value: additionalSearchSummary || NONE,
              },
              { label: 'Skip Website Scraping', value: skipWebsiteScraping ? 'Yes' : 'No' },
            ],
          },
        ]}
      />
    </>
  );
}
