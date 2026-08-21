import { type ReactNode, type HTMLAttributes } from 'react';
import './Badge.css';

export type BadgeTone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}

export default function Badge({ tone, children, className, ...rest }: BadgeProps) {
  return (
    <span className={`q-badge q-badge--${tone}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </span>
  );
}
