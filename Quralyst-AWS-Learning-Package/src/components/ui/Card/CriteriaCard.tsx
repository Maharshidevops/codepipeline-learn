// CriteriaCard — research-form card variants (criteria-cards.css): light (#E8F4FC), deep (#282561
// navy), white, glass (blur). Used across the 3 process wizards for section panels.
import { type HTMLAttributes } from 'react';

export type CriteriaCardVariant = 'light' | 'deep' | 'white' | 'glass';

export interface CriteriaCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CriteriaCardVariant;
}

export default function CriteriaCard({
  variant = 'white',
  className,
  children,
  ...rest
}: CriteriaCardProps) {
  return (
    <div
      className={['criteria-card', `criteria-card--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
