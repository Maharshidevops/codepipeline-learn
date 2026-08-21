// BillingStripeBody — port of Backup/templates/billing/_billing_stripe_body.html.
// Presentational: subscription / credits / last-invoice / payment-method cards in a Bootstrap
// row g-4 grid, plus the "Manage Billing in Stripe" portal button (admin only). The legacy portal
// <script> becomes an onClick → billingService.openPortal() → window.location.href.
import { useState } from 'react';
import type { BillingBody } from '@/services/api/billingService';
import { billingService } from '@/services/api';
import { paths } from '@/routes/paths';
import { Badge, Card } from '@/components/ui';
import { formatDateTimeShort } from '@/lib/datetime';
import type { BadgeTone } from '@/components/ui';

function statusTone(status: string): BadgeTone {
  if (status === 'active') return 'success';
  if (status === 'trialing') return 'info';
  if (status === 'past_due') return 'warning';
  return 'secondary';
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export default function BillingStripeBody({ data }: { data: BillingBody }) {
  const { subscription, planMeta, balance, lastInvoice, paymentMethods, isAdmin } = data;
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  const hasSubscription = Boolean(subscription && subscription.status);
  const activePaymentMethods = paymentMethods.filter((pm) => pm.isActive);

  const openPortal = async () => {
    setError('');
    setPortalLoading(true);
    try {
      const { url } = await billingService.openPortal();
      if (!url) throw new Error('Could not open portal.');
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open portal.');
      setPortalLoading(false);
    }
  };

  return (
    <>
      <div className="row g-4">
        {/* Subscription summary */}
        <div className="col-md-6">
          <Card className="h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                <i className="bi bi-card-checklist" /> Subscription
              </h5>

              {hasSubscription && subscription ? (
                <>
                  <p className="mb-2">
                    <strong>{planMeta?.name || subscription.planCode || 'Unknown'}</strong>{' '}
                    <Badge tone={statusTone(subscription.status)}>{subscription.status}</Badge>
                  </p>
                  <p className="text-muted small mb-1">
                    Billing cycle: {subscription.billingCycle || '—'}
                  </p>
                  <p className="text-muted small mb-1">Seats: {subscription.seats || 1}</p>
                  {subscription.trialEndsAt && (
                    <p className="text-muted small mb-1">
                      Trial ends: {formatDateTimeShort(subscription.trialEndsAt)}
                    </p>
                  )}
                  {subscription.currentPeriodEnd && (
                    <p className="text-muted small mb-1">
                      Next billing: {formatDateTimeShort(subscription.currentPeriodEnd)}
                    </p>
                  )}
                  {subscription.cancelAtPeriodEnd && (
                    <div className="alert alert-warning mt-3 mb-0 p-2 small">
                      Subscription will cancel at the end of the current period.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-muted">No active subscription.</p>
                  {isAdmin ? (
                    <a href={paths.pricing} className="btn btn-standard">
                      Pick a plan
                    </a>
                  ) : (
                    <p className="text-muted small mb-0">
                      Ask your organization owner or admin to pick a plan.
                    </p>
                  )}
                </>
              )}
            </div>

            {hasSubscription && isAdmin && (
              <div className="card-footer bg-transparent">
                <button
                  type="button"
                  className="btn btn-standard"
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    'Opening...'
                  ) : (
                    <>
                      <i className="bi bi-credit-card-2-front" /> Manage Billing in Stripe
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Credits summary */}
        <div className="col-md-6">
          <Card className="h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                <i className="bi bi-coin" /> Credits
              </h5>

              {balance ? (
                <>
                  <p className="mb-1">
                    <strong>Plan credits:</strong> {balance.planBalance}
                  </p>
                  <p className="mb-1">
                    <strong>Top-up credits:</strong> {balance.topupBalance}
                  </p>
                  <p className="text-muted small mb-3">
                    Reserved (active jobs): {balance.reserved}
                  </p>
                  <p className="text-muted small mb-0">1 credit = 10 companies processed.</p>
                </>
              ) : (
                <p className="text-muted">No credits yet — pick a plan to get started.</p>
              )}
            </div>
            {isAdmin &&
              subscription &&
              ['active', 'trialing', 'past_due'].includes(subscription.status) && (
                <div className="card-footer bg-transparent">
                  <a href={`${paths.pricing}#topups`} className="btn btn-standard">
                    <i className="bi bi-plus-circle" /> Buy more credits
                  </a>
                </div>
              )}
          </Card>
        </div>

        {/* Last invoice */}
        {lastInvoice && lastInvoice.stripeInvoiceId && (
          <div className="col-md-6">
            <Card className="h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <i className="bi bi-receipt" /> Last Invoice
                </h5>
                <p className="mb-1">
                  ${((lastInvoice.amount || 0) / 100).toFixed(2)}{' '}
                  {(lastInvoice.currency || 'usd').toUpperCase()}{' '}
                  <Badge tone="secondary">{lastInvoice.status}</Badge>
                </p>
                {lastInvoice.paidAt && (
                  <p className="text-muted small mb-2">
                    Paid: {formatDateTimeShort(lastInvoice.paidAt)}
                  </p>
                )}
                {lastInvoice.hostedUrl && (
                  <a
                    href={lastInvoice.hostedUrl}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-standard"
                  >
                    View invoice
                  </a>
                )}
                {lastInvoice.pdfUrl && (
                  <a
                    href={lastInvoice.pdfUrl}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-standard"
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Payment methods */}
        {activePaymentMethods.length > 0 && (
          <div className="col-md-6">
            <Card className="h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <i className="bi bi-credit-card" /> Payment Methods
                </h5>
                {activePaymentMethods.map((pm, i) => (
                  <p className="mb-1" key={`${pm.brand}-${pm.last4}-${i}`}>
                    {capitalize(pm.brand)} •••• {pm.last4}{' '}
                    <small className="text-muted">
                      exp {pm.expMonth}/{pm.expYear}
                    </small>{' '}
                    {pm.isDefault && <Badge tone="info">default</Badge>}
                  </p>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger mt-4" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
