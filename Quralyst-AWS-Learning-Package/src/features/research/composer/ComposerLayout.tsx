// Two-column composer layout + sticky Run Summary (Replit ComposerLayout / RunPanel).
import type { ReactNode } from 'react';

export function ComposerLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="lb-layout">
      <div className="lb-layout__main">{left}</div>
      <aside className="lb-layout__aside">{right}</aside>
    </div>
  );
}

export type SummaryItem = { label: string; value: string };
export type ChecklistItem = { label: string; done: boolean; nudge?: boolean };

export function RunPanel({
  summary,
  outputs,
  checklist,
  action,
}: {
  summary: SummaryItem[];
  outputs?: string[];
  checklist?: ChecklistItem[];
  action: ReactNode;
}) {
  const shown = summary.filter((s) => s.value);
  return (
    <div className="lb-run-panel">
      <p className="lb-run-panel__title">Run summary</p>
      <dl className="lb-run-panel__summary">
        {shown.length === 0 ? (
          <p className="lb-run-panel__empty">Configure the form to get started.</p>
        ) : (
          shown.map((s) => (
            <div key={s.label} className="lb-run-panel__row">
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))
        )}
      </dl>

      {outputs && outputs.length > 0 && (
        <div className="lb-run-panel__block">
          <p className="lb-run-panel__title">In your results</p>
          <div className="lb-run-panel__tags">
            {outputs.map((o) => (
              <span key={o}>{o}</span>
            ))}
          </div>
        </div>
      )}

      <div className="lb-run-panel__block">
        {checklist && checklist.length > 0 && (
          <ul className="lb-run-panel__checklist">
            {checklist.map((c) => (
              <li
                key={c.label}
                className={c.done ? 'is-done' : c.nudge ? 'is-nudge' : 'is-pending'}
              >
                <i className={`bi ${c.done ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        )}
        {action}
      </div>
    </div>
  );
}
