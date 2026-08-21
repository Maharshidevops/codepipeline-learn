// FaqPage — port of faq.html. Section nav (persisted to localStorage) + per-section accordion
// (single item open, first item open on section switch). Keyboard Enter/Space + aria-expanded.
// Content from src/data/faq.tsx. Rich answers are JSX (Phase 31 — no dangerouslySetInnerHTML).
import { useState } from 'react';
import { faqSectionOrder, faqSections } from '@/data/faq';
import '@/styles/pages/faq.css';

const STORAGE_KEY = 'quralyst:faqActiveSection';

export default function FaqPage() {
  const [activeSection, setActiveSection] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return saved && faqSections[saved] ? saved : faqSectionOrder[0];
  });
  // Index of the open item within the active section (0 = first open by default).
  const [openIndex, setOpenIndex] = useState(0);

  const selectSection = (section: string) => {
    setActiveSection(section);
    setOpenIndex(0); // open first item of the newly selected section
    try {
      window.localStorage.setItem(STORAGE_KEY, section);
    } catch {
      /* ignore */
    }
  };

  const toggleItem = (index: number) => {
    setOpenIndex((cur) => (cur === index ? -1 : index));
  };

  const items = faqSections[activeSection] ?? [];

  return (
    <div className="faq-container">
      <div className="faq-header">
        <h1 className="faq-title">Frequently Asked Questions</h1>
        <p className="faq-subtitle">Your finance Co pilot</p>
      </div>

      <div className="faq-content">
        <div className="faq-sections-nav" id="faqSectionsNav" aria-label="FAQ sections">
          {faqSectionOrder.map((section) => (
            <button
              key={section}
              type="button"
              className={`faq-section-btn${section === activeSection ? ' active' : ''}`}
              data-section={section}
              onClick={() => selectSection(section)}
            >
              {section}
            </button>
          ))}
        </div>

        <div className="faq-section-panel active" data-section-panel={activeSection}>
          <div className="faq-accordion">
            {items.map((faq, i) => {
              const open = i === openIndex;
              return (
                <div key={i} className={`faq-item${open ? ' active' : ''}`}>
                  <div
                    className="faq-question"
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={() => toggleItem(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItem(i);
                      }
                    }}
                  >
                    {/* a11y (Phase 35): h2, not h3 — the page heading is the h1 and questions are
                        its direct sub-sections (axe: heading-order). .faq-question-text overrides
                        every element-level style (size/weight/color/margin) so it renders identically. */}
                    <h2 className="faq-question-text">{faq.question}</h2>
                    <div className="faq-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="faq-answer">
                    {typeof faq.answer === 'string' ? (
                      <p className="faq-answer-text">{faq.answer}</p>
                    ) : (
                      <div className="faq-answer-text faq-answer-rich">{faq.answer}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
