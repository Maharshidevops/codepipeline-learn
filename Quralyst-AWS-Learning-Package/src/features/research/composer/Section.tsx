// Lightweight section chrome for Replit-style single-page composers.
import type { ReactNode } from 'react';

export function SectionGroup({
  step,
  title,
  description,
  children,
  id,
}: {
  step?: number;
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="lb-section-group">
      <div className="lb-section-group__head">
        {typeof step === 'number' && <span className="lb-section-group__step">{step}</span>}
        <div>
          <h2 className="lb-section-group__title">{title}</h2>
          {description && <p className="lb-section-group__desc">{description}</p>}
        </div>
      </div>
      <div className="lb-section-group__body">{children}</div>
    </section>
  );
}

export function SectionCard({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div className="lb-section-card">
      <div className="lb-section-card__head">
        {icon && (
          <div className="lb-section-card__icon" aria-hidden>
            <i className={`bi ${icon}`} />
          </div>
        )}
        <div>
          <h3 className="lb-section-card__title">{title}</h3>
          {hint && <p className="lb-section-card__hint">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
