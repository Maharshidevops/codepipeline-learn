// Tooltip — info tooltip (tooltips.css: .info-tooltip + .tooltip-text, 400px navy popover shown on
// hover via CSS). Wraps a trigger (default: a bi-info-circle .info-icon) and reveals `content`.
import { type ReactNode } from 'react';

export interface TooltipProps {
  content: ReactNode;
  placement?: 'top' | 'bottom';
  children?: ReactNode; // custom trigger; defaults to the info icon
}

export default function Tooltip({ content, placement = 'bottom', children }: TooltipProps) {
  return (
    <span className="info-tooltip" data-placement={placement}>
      {children ?? <i className="bi bi-info-circle info-icon" aria-hidden="true" />}
      <span className="tooltip-text" role="tooltip">
        {content}
      </span>
    </span>
  );
}
