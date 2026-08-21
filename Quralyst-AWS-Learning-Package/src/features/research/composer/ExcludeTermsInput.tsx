// Chip input for "What are you NOT looking for?" (exclude_term[]).
import { useState, type KeyboardEvent } from 'react';

export interface ExcludeTermsInputProps {
  terms: string[];
  onChange: (terms: string[]) => void;
}

export default function ExcludeTermsInput({ terms, onChange }: ExcludeTermsInputProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    // Replit TargetMode splits on commas so "a, b, c" becomes three chips.
    const parts = draft
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...terms];
    for (const part of parts) {
      if (!next.some((x) => x.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div>
      {terms.length > 0 && (
        <div className="rc-chips">
          {terms.map((t) => (
            <span key={t} className="rc-chip">
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => onChange(terms.filter((x) => x !== t))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="rc-chip-input">
        <input
          className="form-control"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          placeholder="e.g. staffing agency, reseller"
        />
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}
