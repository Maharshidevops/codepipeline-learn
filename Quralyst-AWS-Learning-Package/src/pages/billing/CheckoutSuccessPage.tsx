// CheckoutSuccessPage — port of billing/checkout_success.html. Polls subscription-json ≤30×1s
// until the webhook hydrates the subscription, then redirects to org billing. Rendered in AppLayout.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { billingService } from '@/services/api';
import { paths } from '@/routes/paths';
import '@/styles/pages/billing.css';

const MAX_TRIES = 30;

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orgSlug = params.get('org_slug') ?? '';
  const [status, setStatus] = useState('Waiting for Stripe to confirm…');
  const [showButton, setShowButton] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    let tries = 0;

    const billingPath = orgSlug ? paths.org.billing(orgSlug) : paths.pricing;

    const check = async () => {
      if (cancelled.current) return;
      tries++;
      try {
        const data = await billingService.getSubscription();
        const sub = data.subscription;
        if (sub && sub.status && sub.status !== 'incomplete') {
          setStatus('All set! Redirecting to your billing page…');
          setShowButton(true);
          window.setTimeout(() => navigate(billingPath), 1500);
          return;
        }
      } catch {
        // ignore — retry
      }
      if (tries >= MAX_TRIES) {
        setStatus('Still finalizing. Go ahead — your subscription will appear shortly.');
        setShowButton(true);
        return;
      }
      window.setTimeout(check, 1000);
    };
    void check();

    return () => {
      cancelled.current = true;
    };
  }, [navigate, orgSlug]);

  const billingPath = orgSlug ? paths.org.billing(orgSlug) : paths.pricing;

  return (
    <div className="container py-5 text-center">
      <div className="mb-4">
        <i className="bi bi-check-circle-fill text-success billing-status-icon billing-status-icon--lg" />
      </div>
      <h1 className="h1 mb-3">Payment received</h1>
      <p className="text-muted">Setting up your account…</p>

      {!showButton && (
        <div className="d-flex justify-content-center my-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      )}

      <p className="small text-muted">{status}</p>

      {showButton && (
        <button
          type="button"
          className="btn btn-standard mt-3"
          onClick={() => navigate(billingPath)}
        >
          Go to billing
        </button>
      )}
    </div>
  );
}
