// BillingPage — Stripe dashboard for admins; credits-only for members.
import { useEffect, useState } from 'react';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import { billingService } from '@/services/api';
import type { BillingBody } from '@/services/api/billingService';
import { paths } from '@/routes/paths';
import { Spinner } from '@/components/ui';
import BillingStripeBody from '@/components/billing/BillingStripeBody';

export default function BillingPage() {
  const slug = useOrgSlug();
  useOrgPageMeta(
    'Billing',
    <>
      <span className="org-meta-line">
        Quralyst · slug <code>{slug}</code>
      </span>
      Subscription, credits, and payment methods.
    </>,
  );

  const [data, setData] = useState<BillingBody | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    billingService
      .getBillingBody(slug)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading || !data) {
    return (
      <div className="org-tab-loading">
        <Spinner />
      </div>
    );
  }

  const isAdmin = data.isAdmin;
  const { balance } = data;

  return (
    <div className="org-section">
      <div className="org-section-header">
        <div>
          <h2 className="org-section-title">{isAdmin ? 'Plans & usage' : 'Credits'}</h2>
          <p className="org-section-sub">
            {isAdmin
              ? 'Subscription, invoices, and payment methods'
              : 'Your organization credit balances'}
          </p>
        </div>
        {isAdmin && (
          <div className="org-section-actions">
            <a href={paths.pricing} className="btn btn-standard">
              <i className="bi bi-tag me-1" /> View plans & top-ups
            </a>
          </div>
        )}
      </div>
      <div className="org-section-body">
        {isAdmin ? (
          <div className="org-billing-body">
            <BillingStripeBody data={data} />
          </div>
        ) : (
          <div className="org-metrics is-two">
            <div className="org-metric-card">
              <div className="org-metric-label">Plan credits</div>
              <div className="org-metric-value">{balance?.planBalance ?? '—'}</div>
              <div className="org-metric-sub">
                Reserved: {balance?.reserved ?? 0} · 1 credit = 10 companies
              </div>
            </div>
            <div className="org-metric-card">
              <div className="org-metric-label">Top-up credits</div>
              <div className="org-metric-value">{balance?.topupBalance ?? '—'}</div>
              <div className="org-metric-sub">Purchased outside the plan</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
