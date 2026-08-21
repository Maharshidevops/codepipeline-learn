// FAQ content — ported verbatim from Backup/routes/faq.py (FAQ_ITEMS). Static app content;
// could move behind an endpoint later. Rich answers are JSX (Phase 31 — the former answerHtml
// string + dangerouslySetInnerHTML sink is gone; React escapes everything by default).
import type { ReactNode } from 'react';

export interface FaqEntry {
  question: string;
  answer: ReactNode;
}

export const faqSectionOrder: string[] = [
  'General',
  'Target List',
  'Strategic List',
  'Financial Vertical',
  'Previous Results',
  'User Preferences',
];

export const faqSections: Record<string, FaqEntry[]> = {
  General: [
    {
      question: 'What is Quralyst and why is it the best finance co pilot?',
      answer:
        'Quralyst is an advanced business research tool designed to streamline your company data enrichment and analysis workflow. It combines AI-powered insights with Apollo.io integration to provide comprehensive business intelligence. Our platform offers automated data processing, real-time progress tracking, and multi-tenant architecture ensuring secure data isolation for your organization.',
    },
    {
      question: 'Where do I begin after logging in?',
      answer:
        "Start from 'Start processing' in the sidebar. This opens the page where you choose which workflow to run: Target List, Strategic Buyer List, or Financial Buyer List.",
    },
    {
      question: 'Can I use AI to improve my prompts before processing?',
      answer:
        'Yes. Quralyst provides AI enhancement helpers (such as business-query or target-description enhancement) to help you refine input quality before running a search.',
    },
    {
      question: 'Can I reuse criteria from a previous run?',
      answer:
        'Yes. Relevant workflows support reusing filters from earlier results so you can rerun faster with consistent settings.',
    },
    {
      question: 'Can I keep working on other pages while processing runs?',
      answer:
        'Yes. Processing progress can be minimized to the sidebar tracker so you can continue using other pages. You can click the tracker anytime to reopen progress.',
    },
    {
      question: 'What happens if my internet disconnects during processing?',
      answer:
        'Quralyst keeps handling long-running processing on the server side when possible, shows an offline warning, and attempts to recover progress status when connection is restored.',
    },
  ],
  'Target List': [
    {
      question: 'How do I upload and process my business data?',
      answer:
        "Simply navigate to 'Start Processing' from the sidebar, upload your CSV or Excel file containing company data, and our AI-powered system will automatically standardize and enrich your data with business insights, location information, and Apollo.io data enrichment.",
    },
    {
      question: 'What file formats are supported for upload?',
      answer:
        'Quralyst supports CSV and Excel (.xlsx, .xls) file formats. Our intelligent file standardization system automatically detects and maps your columns to standard business fields, making it easy to work with data from any source.',
    },
    {
      question: 'What criteria can I set before processing Target List?',
      answer:
        'You can set business description, industry/sub-industry, primary/secondary activity, optional website scraping behavior, size criteria, geography criteria, custom insight questions, enrichment toggles, and additional company search options.',
    },
    {
      question: 'What is Brief business description used for?',
      answer:
        'It is your core AI prompt for business-fit evaluation. Quralyst uses this description as a primary signal when classifying fit and computing business score.',
    },
    {
      question: 'What does Enhance Query with AI do?',
      answer:
        'Enhance Query refines your business description into a clearer and more evaluable prompt, which can improve consistency of fit scoring across rows.',
    },
    {
      question: 'What does Skip Website Scraping do?',
      answer:
        'It tells Quralyst to validate companies primarily from uploaded/source descriptions rather than scraping website content. This can reduce page fetch overhead but may limit detail depth.',
    },
    {
      question: 'What does Primary Business Only mean?',
      answer:
        "Primary Business Only focuses matching on the company's core business profile so secondary or unrelated activities do not dominate fit scoring.",
    },
    {
      question: 'How does Size Logic (AND/OR) affect matching?',
      answer:
        'AND requires both revenue and employee criteria to align for stronger size fit, while OR allows a match when either revenue or employee criteria is satisfied.',
    },
    {
      question: 'What does Include News Enrichment do?',
      answer:
        'When enabled, Quralyst adds recent news context and updates about matched companies to improve research context and screening decisions.',
    },
    {
      question: 'What does Include Apollo Data Enrichment do?',
      answer:
        'It enriches matched companies with Apollo company/contact attributes (when available), improving completeness for downstream review and outreach workflows.',
    },
    {
      question: 'What does Include LinkedIn Enrichment do?',
      answer:
        'It adds LinkedIn-based company enrichment where available, giving more context such as profile-level company signals.',
    },
    {
      question: 'What does Enrich more companies from Apollo do?',
      answer:
        'It runs additional search against Apollo and appends extra candidate companies beyond the uploaded list, based on your criteria.',
    },
    {
      question: 'What does Enrich more companies from Google Maps do?',
      answer:
        'It searches Google Maps for additional businesses matching your criteria and adds them to the pipeline.',
    },
    {
      question: 'What does Enrich more companies from Coresignal do?',
      answer:
        'It pulls additional company candidates from Coresignal, then evaluates them with your configured logic and enrichment settings.',
    },
    {
      question: 'Why can Coresignal search be disabled when Skip Website Scraping is enabled?',
      answer:
        'Skip Website Scraping can limit descriptive validation depth for Coresignal candidates, so Coresignal search may be auto-disabled to avoid low-confidence matching.',
    },
    {
      question: 'What does Enrich more companies from LinkedIn do?',
      answer:
        'It uses LinkedIn-based discovery to add more matching companies, then applies your configured scoring and enrichment workflow.',
    },
    {
      question: 'What does Use Company Size in Custom Insights do?',
      answer:
        'When enabled, custom-insight prompts include company size context so generated answers are aligned with scale-related expectations.',
    },
    {
      question: 'Can I stop processing after it starts?',
      answer:
        'Yes. Use the Stop button in the processing modal to cancel the current run. If stopped early, results may be partial or not saved depending on stage.',
    },
    {
      question: 'Can I save and reuse custom insights questions?',
      answer:
        'Yes. In Custom Insights, you can create question sets, save them, and load them later to speed up repeat workflows.',
    },
    {
      question: 'Which enrichment/search sources are available?',
      answer:
        'You can enable News enrichment, Apollo enrichment, LinkedIn enrichment, and optional additional search from Apollo, Google Maps, Coresignal, and LinkedIn.',
    },
  ],
  'Strategic List': [
    {
      question: 'How does the AI-powered analysis work?',
      answer:
        "Our system uses OpenAI's GPT models to analyze company data, generate business descriptions, score company fitness based on your criteria, and provide intelligent insights. The AI also helps standardize your data fields and extract meaningful information from company websites.",
    },
    {
      question: 'What is different in Strategic Buyer List vs Target List?',
      answer:
        'Strategic Buyer List is tuned for buyer discovery and strategic alignment. It includes seller attributes and a buyer recommendation flow that helps generate ideal buyer-type descriptions.',
    },
    {
      question: 'What is the seller Brief business description used for?',
      answer:
        'It defines the seller context that drives strategic matching. Quralyst uses it as a key prompt for identifying likely strategic buyers.',
    },
    {
      question: 'How does Ideal Buyer Recommendation work?',
      answer:
        'You provide seller context and optionally select buyer modes like Horizontal, Vertical, or Adjacent. Quralyst then enhances the target description to suggest an ideal buyer profile.',
    },
    {
      question: 'Can I use the same enrichment and search options in Strategic List?',
      answer:
        'Yes. Strategic List supports similar enrichment and additional source options (Apollo, Google Maps, Coresignal, LinkedIn), plus custom insights and scoring criteria.',
    },
    {
      question: 'What does Skip Website Scraping do in Strategic List?',
      answer:
        'It avoids website scraping during strategic screening and relies more heavily on available source descriptions and configured criteria.',
    },
    {
      question: 'What do Horizontal, Vertical, and Adjacent buyer modes mean?',
      answer:
        'Horizontal targets similar-market buyers, Vertical targets supply-chain or value-chain participants, and Adjacent targets nearby markets with strategic overlap.',
    },
    {
      question: 'What does Generate Recommendation do on this page?',
      answer:
        'It enhances the buyer-type description from your seller context and selected buyer mode(s), helping you define better strategic screening criteria.',
    },
    {
      question: 'What does Enhance Strategic Description with AI do?',
      answer:
        'It rewrites and sharpens your Strategic Description so strategic matching logic has clearer intent and stronger context.',
    },
    {
      question: 'Can I use the same AI prompt/enhance flow as Target List?',
      answer:
        'Yes. Strategic List also supports AI-assisted prompt improvement, including enhancement of buyer-target description and criteria clarity.',
    },
    {
      question: 'Can I reuse filters from an earlier Strategic run?',
      answer:
        'Yes. The workflow supports filter reuse from previous results so you can rerun with minimal manual setup.',
    },
  ],
  'Financial Vertical': [
    {
      question: 'Can I track the progress of my data processing?',
      answer:
        'Yes! Quralyst provides real-time progress tracking for all your processing sessions. You can monitor each step of the enrichment process through our intuitive progress bar, and receive notifications when processing is complete.',
    },
    {
      question: 'What inputs are available in Financial Buyer List?',
      answer:
        'You can define target description, business type, industry/sub-industry, HQ location, size metrics (revenue, EBITDA, equity check, enterprise value), PE exposure options, and optional contact request.',
    },
    {
      question: 'What is the target description prompt used for in Financial Vertical?',
      answer:
        'It is the AI context for evaluating PE firm relevance to your target profile, and influences fit status, reasoning, and scoring outputs.',
    },
    {
      question: 'What does PE Level of Exposure mean?',
      answer:
        'PE exposure filters define how a firm should relate to your target context through portfolio similarity and listed-interest signals.',
    },
    {
      question: "What does 'Should have current similar portfolio company' do?",
      answer:
        'When selected, Quralyst prioritizes firms that currently hold portfolio companies similar to your target profile.',
    },
    {
      question: "What does 'Should have past similar portfolio company' do?",
      answer:
        'When selected, Quralyst includes firms with historical portfolio exposure to similar companies, even if those holdings are not current.',
    },
    {
      question: "What does 'Should have listed interest in relevant Industry' do?",
      answer:
        'When selected, Quralyst favors firms that have explicitly stated investment interest in your target industry or close categories.',
    },
    {
      question: 'Can I enter custom industry/sub-industry values?',
      answer:
        'Yes. The form supports toggling to custom inputs when predefined industry and sub-industry values do not fit your use case.',
    },
    {
      question: 'Can I stop Financial Vertical processing?',
      answer:
        'Yes. Use the Stop button in the Financial Vertical progress modal to cancel the active run.',
    },
    {
      question: 'Can I prefill Financial Vertical form from previous results?',
      answer:
        'Yes. Reuse filters can prefill industry, sub-industry, location, size, and exposure fields from a past Financial Vertical result.',
    },
    {
      question: 'Can I reuse previous filters in Financial Vertical similar to other workflows?',
      answer:
        'Yes. Financial Vertical has a filter-reuse flow so you can reopen prior criteria, adjust quickly, and rerun.',
    },
    {
      question: 'What is Financial Verticals DB page used for?',
      answer:
        'It is a dedicated upload/process utility for creating or refreshing Financial Verticals database mappings from spreadsheet files.',
    },
    {
      question: 'Does the Financial Verticals DB uploader support drag-and-drop?',
      answer:
        'Yes. You can drag and drop a supported file or choose it manually, then click Upload and Process.',
    },
  ],
  'Previous Results': [
    {
      question: 'How do I access my previous results?',
      answer:
        "Click on 'Previous Results' in the sidebar to view all your past processing sessions. You can search, filter, download results as CSV or Excel, and even add comments to individual companies for collaboration with your team.",
    },
    {
      question: 'Can I filter and sort previous results?',
      answer:
        'Yes. You can filter by time range, date order, user, filename, and applied filter types, and switch between Target List, Strategic Buyer List, and Financial Buyer List tabs.',
    },
    {
      question: 'Can I delete old results?',
      answer:
        'Yes. For results you own, delete actions are available from the Previous Results cards.',
    },
    {
      question: 'Can I download stored result files later?',
      answer:
        'Yes. If a stored output file exists, download links are available directly from Previous Results.',
    },
    {
      question: 'What is the difference between View Details and CRM data editing?',
      answer:
        'View Details opens the result-level view, filters, and score context. CRM editing is used when you want to update manual CRM fields for companies in that result.',
    },
    {
      question: 'What can I do on the detailed result page?',
      answer:
        'You can view the full results table, apply table filters, sort rows by key fields, inspect long cell content in modal view, and review all filters used for that run.',
    },
    {
      question: 'What does the Company Name column represent?',
      answer:
        'It is the normalized company identity used for row-level analysis and reporting. Names are typically standardized during processing.',
    },
    {
      question: 'What does the Business Description column represent?',
      answer:
        'It contains the company activity summary used during fit evaluation. Depending on settings, it may come from source data, scraping, or enrichment context.',
    },
    {
      question: 'What do Revenue and Employees columns represent?',
      answer:
        'These columns show size indicators used by size scoring logic. Values may originate from uploaded data and/or enabled enrichment sources.',
    },
    {
      question: 'What do Country, State, and City columns represent?',
      answer:
        'They represent normalized geography fields used to compute location fit against your configured geographic criteria.',
    },
    {
      question: 'What does Source mean in results?',
      answer:
        'Source indicates where a record primarily came from, such as uploaded file rows or additional enabled discovery channels.',
    },
    {
      question: 'What does Fit Status mean?',
      answer:
        'Fit Status is a categorical outcome (for example Fit, Partial Fit, No Fit, or Insufficient Info) derived from criteria checks and model evaluation.',
    },
    {
      question: 'What does Business Score measure?',
      answer:
        'Business Score (0-100) measures how strongly each company matches your business-query intent and activity criteria.',
    },
    {
      question: 'What does Geography Score measure?',
      answer:
        'Geography Score (0-100) measures alignment between company location fields and your selected geo filters (city/state/country).',
    },
    {
      question: 'What does Size Scores measure?',
      answer:
        'Size Scores (0-100) reflect revenue and employee alignment under your chosen AND/OR size logic.',
    },
    {
      question: 'What does Final Score represent?',
      answer:
        'Final Score is the weighted combined score using active criteria only. It is the primary ranking value used for result ordering.',
    },
    {
      question: 'What is Rationale or Reasoning in results?',
      answer:
        'Rationale/Reasoning summarizes why a company or firm was classified as fit or not fit, based on detected signals from your configured criteria.',
    },
    {
      question: 'What are Custom Insight columns in results?',
      answer:
        'Each custom question you add can generate answer columns in results, giving structured insight outputs for every company row.',
    },
    {
      question: 'How are filters shown in Result Details useful?',
      answer:
        'The Filters Used panel shows the exact options/toggles for that run (criteria, enrichment, search sources, and limits), so the run is auditable and reproducible.',
    },
    {
      question: 'What does Summary page show for a result?',
      answer:
        'Summary provides aggregate metrics such as total records analyzed, fit counts, and distribution views (for example geographic and size-related breakdowns).',
    },
    {
      question: 'What columns are shown in Financial Buyer List results?',
      answer:
        'Financial buyer results include Firm Name, Fit Status, Final Score, Reasoning, Matched Companies, Website, Location, Revenue, EBITDA, Enterprise Value, Equity Value, Listed Interests, and Portfolio.',
    },
    {
      question: 'How is Financial Vertical Final Score shown?',
      answer:
        'Financial vertical final score is displayed as a percentage-style score (derived from normalized scoring output) to rank PE-firm relevance.',
    },
    {
      question: 'How is scoring calculated in results?',
      answer: (
        <>
          <p>
            Each row shows <strong>Business Score</strong>, <strong>Geography Score</strong>,{' '}
            <strong>Size Scores</strong>, and <strong>Final Score</strong> (0-100).
          </p>
          <p>
            <strong>Final Score formula:</strong>
            <br />
            Final Score = (Business Score x Business Weight) + (Size Score x Size Weight) +
            (Geography Score x Geography Weight)
          </p>
          <ul>
            <li>All 3 criteria active: Business 50%, Size 25%, Geography 25%</li>
            <li>2 criteria active: 50/50 split</li>
            <li>1 criterion active: final score equals that criterion</li>
          </ul>
          <p>
            <strong>Final Score example:</strong>
            <br />
            Business=80, Size=60, Geography=100
            <br />
            Final=(80x0.50)+(60x0.25)+(100x0.25)=40+15+25=80
          </p>
          <p>
            <strong>Size Score logic:</strong>
          </p>
          <ul>
            <li>Checks employee + revenue criteria</li>
            <li>If both fail -&gt; 0</li>
            <li>AND logic: one pass -&gt; 25-50, both pass -&gt; 50-100</li>
            <li>OR logic: one pass -&gt; 50-75, both pass -&gt; 75-100</li>
            <li>Inside each band, better match progression gives a higher score</li>
          </ul>
        </>
      ),
    },
  ],
  'User Preferences': [
    {
      question: 'Which API keys can I configure in User Preferences?',
      answer:
        'You can configure keys for OpenAI, Apollo, News, Google Maps Extractor, Coresignal, LinkedIn (Apify), and Claude (Anthropic), depending on enabled features.',
    },
    {
      question: 'How do I verify my API keys are working?',
      answer:
        "Use the 'Test API Keys' action in User Preferences. Quralyst runs key checks and updates status indicators so you can quickly see valid/invalid configurations.",
    },
    {
      question: 'Can I edit keys without exposing existing values?',
      answer:
        'Yes. Existing keys are masked. Click Edit Keys to update values, then save and optionally retest.',
    },
    {
      question: 'Can I clear all saved API keys?',
      answer: "Yes. User Preferences includes a 'Clear all keys' action.",
    },
    {
      question: 'Why are keys masked with dots?',
      answer:
        'For security, saved keys are shown masked in the UI. You can still replace them in edit mode without exposing prior values.',
    },
  ],
};
