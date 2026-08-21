// AiAssistPanel — the AI-assist controls from the process-page snapshots:
//  • autofill              → "Auto Fill with Ai" card + "Generate with Ai" → prompt MODAL → autofill
//  • buyer-recommendation  → "Get an Ideal Buyer Recommendation" + editable Ai Prompt + "Enrich"
//  • custom-insights       → "Generate Custom Insights" button
// autofill is wired to the real backend (researchService.autofill → /api/extract-form-criteria): the
// user types a prompt in a modal, we extract form criteria and hand them to onResult. The other modes
// still return canned suggestions behind the same onResult callback.
import { useState } from 'react';
import Spinner from '@/components/ui/Spinner/Spinner';
import Modal from '@/components/ui/Modal/Modal';
import { researchService } from '@/services/api';
import './Wizard.css';

export type AiAssistMode = 'autofill' | 'buyer-recommendation' | 'custom-insights';

export interface AiAssistPanelProps {
  mode: AiAssistMode;
  onResult: (data: unknown) => void;
  defaultPrompt?: string;
  /** When false, suppresses the built-in card title (use when the parent already renders one). */
  showTitle?: boolean;
}

const CANNED: Record<AiAssistMode, unknown> = {
  autofill: {
    businessQuery: 'Mid-market B2B software companies in North America with $10M–$50M revenue',
    industry: 'Information Technology & Software Services',
    subIndustry: 'Custom & Enterprise Software (ERP, CRM, SCM, cybersecurity, analytics)',
    primaryActivity: 'Service',
  },
  'buyer-recommendation': {
    recommendation:
      'Strategic acquirers in adjacent verticals seeking recurring-revenue expansion; ' +
      'PE platforms consolidating fragmented SaaS niches.',
  },
  'custom-insights': {
    insights: [
      'Top 3 segments by fit score',
      'Estimated TAM for the defined criteria',
      'Suggested outreach sequencing',
    ],
  },
};

export default function AiAssistPanel({
  mode,
  onResult,
  defaultPrompt = '',
  showTitle = true,
}: AiAssistPanelProps) {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [promptOpen, setPromptOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const run = () => {
    setLoading(true);
    // Simulated AI latency; replaced by a mock service call in Phase 7.
    window.setTimeout(() => {
      setLoading(false);
      onResult(CANNED[mode]);
    }, 900);
  };

  // autofill: extract form criteria from the user's typed prompt (never auto-fills without input).
  const submitAutofill = async () => {
    const text = prompt.trim();
    if (!text) {
      setError('Please describe what you are looking for.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await researchService.autofill(text);
      onResult(result);
      setModalOpen(false);
      setPrompt('');
    } catch {
      setError('Could not extract criteria from that description. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'autofill') {
    return (
      <div className="criteria-card criteria-card--light ai-assist-card ai-assist-card--banner">
        {/* Full-width banner (sits between the stepper and the step card): text on the left, the
            Generate action on the right, so the step card below keeps a constant full width. */}
        <div className="ai-assist-banner-text">
          {/* a11y (Phase 35): h3, not h4 — the wizard pages go h2 (page title) → card headings
              (axe: heading-order). Wizard.css pins .ai-assist-title to the old h4 font-size. */}
          <h3 className="ai-assist-title">Auto Fill with Ai</h3>
          <p className="text-muted ai-assist-desc">
            Tell us about the company once, and we&apos;ll auto fill this entire section for you.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-standard ai-assist-banner-btn"
          onClick={() => setModalOpen(true)}
        >
          <i className="bi bi-lightning-fill" aria-hidden="true" /> Generate with Ai
        </button>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="AI-Powered Form Auto-Fill"
          size="md"
        >
          <p className="text-muted mb-3">
            Describe what you&apos;re looking for in natural language, and we&apos;ll fill the form
            for you.
          </p>
          <label className="form-label fw-semibold" htmlFor="ai-autofill-prompt">
            Enter your requirements:
          </label>
          <textarea
            id="ai-autofill-prompt"
            className="form-control"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Candy manufacturers with 1–10 employees in California, $1M–$10M revenue…"
          />
          {error && <div className="text-danger small mt-2">{error}</div>}
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button
              type="button"
              className="btn btn-standard"
              onClick={() => setModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-standard"
              onClick={submitAutofill}
              disabled={loading}
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <i className="bi bi-magic me-1" aria-hidden="true" />
              )}{' '}
              Extract &amp; Fill Form
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  if (mode === 'buyer-recommendation') {
    return (
      <div className="ai-assist-card ai-assist-card--embedded">
        {showTitle && <h3 className="ai-assist-title">Get an Ideal Buyer Recommendation</h3>}
        <button
          type="button"
          className="wizard-step-pill btn-unstyled"
          style={{ marginBottom: promptOpen ? 12 : 0 }}
          onClick={() => setPromptOpen((o) => !o)}
        >
          Ai Prompt
        </button>
        {promptOpen && (
          <>
            <textarea
              className="form-control ai-assist-prompt-input"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your ideal buyer / target…"
            />
            <button type="button" className="btn btn-standard" onClick={run} disabled={loading}>
              {loading ? <Spinner size="sm" /> : null} Enrich
            </button>
          </>
        )}
      </div>
    );
  }

  // custom-insights
  return (
    <button type="button" className="btn btn-standard" onClick={run} disabled={loading}>
      {loading ? <Spinner size="sm" /> : <i className="bi bi-lightbulb" aria-hidden="true" />}{' '}
      Generate Custom Insights
    </button>
  );
}
