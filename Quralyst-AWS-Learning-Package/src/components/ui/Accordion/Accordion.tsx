// Accordion (FaqAccordion) — expand/collapse Q&A list (Accordion.css; slideDown). `answer` is
// any ReactNode (Phase 31 — the answerHtml/dangerouslySetInnerHTML path is gone). Single-open
// by default.
import { useState, type ReactNode } from 'react';

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

export interface FaqAccordionProps {
  items: FaqItem[];
  allowMultiple?: boolean;
}

export default function Accordion({ items, allowMultiple = false }: FaqAccordionProps) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="q-accordion">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const bodyId = `q-accordion-body-${i}`;
        return (
          <div key={i} className={`q-accordion-item${isOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="q-accordion-header"
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => toggle(i)}
            >
              <span>{item.question}</span>
              <i className="bi bi-chevron-down q-accordion-icon" aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="q-accordion-body" id={bodyId} role="region">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
