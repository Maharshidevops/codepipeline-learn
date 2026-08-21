// CheckoutCancelPage — port of billing/checkout_cancel.html. Rendered in AppLayout.
import { Link, useSearchParams } from 'react-router-dom';
import { paths } from '@/routes/paths';
import '@/styles/pages/billing.css';

export default function CheckoutCancelPage() {
  const [params] = useSearchParams();
  const orgSlug = params.get('org_slug') ?? '';
  return (
    <div className="container py-5 text-center">
      <div className="mb-4">
        <i className="bi bi-x-circle-fill text-warning billing-status-icon billing-status-icon--lg" />
      </div>
      <h1 className="h1 mb-3">Checkout cancelled</h1>
      <p className="text-muted">No charges were made. You can pick a plan again anytime.</p>
      <div className="mt-4 d-flex flex-wrap gap-2 justify-content-center">
        {orgSlug && (
          <Link to={paths.org.billing(orgSlug)} className="btn btn-standard">
            <i className="bi bi-credit-card" /> Back to billing
          </Link>
        )}
        <Link to={paths.pricing} className="btn btn-standard">
          <i className="bi bi-tag" /> Back to Pricing
        </Link>
        <Link to={paths.processPreference} className="btn btn-standard">
          Continue to app
        </Link>
      </div>
    </div>
  );
}
