// Universal QuraLyst Button primitive — low-code design system component.
// Supports 4 primary design variants (primary, secondary, ghost, danger), 3 sizes (sm, md, lg),
// pill shape, icon slots, and built-in loading spinner state.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import './Button.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  /* Legacy aliases for backward compatibility */
  | 'standard'
  | 'auth'
  | 'popup-primary'
  | 'popup-secondary'
  | 'clear-all'
  | 'clear-all-text'
  | 'stop';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANT_MAP: Record<ButtonVariant, string> = {
  primary: 'q-btn q-btn--primary',
  secondary: 'q-btn q-btn--secondary',
  ghost: 'q-btn q-btn--ghost',
  danger: 'q-btn q-btn--danger',

  // Legacy mappings
  standard: 'q-btn q-btn--primary',
  auth: 'q-btn q-btn--primary',
  'popup-primary': 'q-btn q-btn--primary',
  'popup-secondary': 'q-btn q-btn--secondary',
  'clear-all': 'q-btn q-btn--ghost',
  'clear-all-text': 'q-btn q-btn--ghost',
  stop: 'q-btn q-btn--danger',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    pill = false,
    loading = false,
    icon,
    disabled,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  const classes = [
    VARIANT_MAP[variant] || 'q-btn q-btn--primary',
    size !== 'md' ? `q-btn--${size}` : '',
    pill ? 'q-btn--pill' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="q-btn__spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="q-btn__icon" aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  );
});

export default Button;
