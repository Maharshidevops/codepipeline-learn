// Spinner — tokenized loading spinner (Spinner.css; navy on faint ring, `spin` keyframe).
import './Spinner.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export default function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  const sizeClass = size === 'sm' ? ' spinner--sm' : size === 'lg' ? ' spinner--lg' : '';
  return (
    <span
      className={`spinner${sizeClass}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
    />
  );
}
