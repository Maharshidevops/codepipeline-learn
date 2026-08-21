// BillingBanner — severity-driven alert shown above app content (trial ending, payment failed, etc.).
// Uses the .alert / .alert-{info,warning,danger} styles (alerts.css + Bootstrap). The dismiss action
// is wired to POST /api/dismiss-banner via the billing service in Phase 4; here it calls onDismiss.
import type { BillingBannerData } from '@/types';
import './billing-banner.css';

export interface BillingBannerProps {
  banner: BillingBannerData;
  onDismiss: (key?: string) => void;
}

const SEVERITY_CLASS: Record<BillingBannerData['severity'], string> = {
  info: 'alert-info',
  warning: 'alert-warning',
  danger: 'alert-danger',
};

export default function BillingBanner({ banner, onDismiss }: BillingBannerProps) {
  return (
    <div className={`alert ${SEVERITY_CLASS[banner.severity]}`} role="alert">
      <div className="billing-banner-content">
        {banner.title && <strong className="billing-banner-title">{banner.title}</strong>}
        <span>{banner.message}</span>
      </div>
      {banner.ctaUrl && (
        <a href={banner.ctaUrl} className="btn btn-standard billing-banner-cta">
          {banner.ctaLabel ?? 'View'}
        </a>
      )}
      {banner.dismissable && (
        <button
          type="button"
          className="popup-close billing-banner-dismiss"
          aria-label="Dismiss"
          onClick={() => onDismiss(banner.key)}
        >
          &times;
        </button>
      )}
    </div>
  );
}
