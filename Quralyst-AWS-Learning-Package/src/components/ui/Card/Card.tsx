// Card — base .card container (cards.css: 2px border, 20px radius, soft shadow).
import { type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export default function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={['card', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
