// PricingPage — port of billing/pricing.html. Monthly/annual toggle drives displayed price
// (monthlyPrice vs annualMonthlyEquivalent); self-serve plans → createCheckoutSession + navigate;
// enterprise plans → sales-seat Modal; top-up packs → createTopupSession. Full-page in AppLayout.
import { useEffect, useMemo, useState } from 'react';
import { Card, Modal, Button } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useModal } from '@/hooks/useModal';
import { billingService } from '@/services/api';
import type { Plan, TopupPack } from '@/types';

type Cycle = 'monthly' | 'annual';

function titleizeFeature(feat: string): string {
  return feat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PricingPage() {
  const { success, error } = useToast();
  const salesModal = useModal();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanCode, setCurrentPlanCode] = useState<string | null>(null);
  const [topupPacks, setTopupPacks] = useState<Record<string, TopupPack>>({});
  const [salesRequestOrgSlug, setSalesRequestOrgSlug] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [pendingPack, setPendingPack] = useState<string | null>(null);

  // Sales seat form
  const [requestedSeats, setRequestedSeats] = useState(10);
  const [note, setNote] = useState('');
  const [salesSubmitting, setSalesSubmitting] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [salesSuccess, setSalesSuccess] = useState(false);

  useEffect(() => {
    billingService
      .getPricing()
      .then((data) => {
        setPlans(data.plans);
        setCurrentPlanCode(data.currentPlanCode);
        setTopupPacks(data.topupPacks);
        setSalesRequestOrgSlug(data.salesRequestOrgSlug);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const annual = cycle === 'annual';
  const cycleLabel = annual ? 'per month, billed annually' : 'per month, billed monthly';

  const topupEntries = useMemo(() => Object.entries(topupPacks), [topupPacks]);

  const startCheckout = async (planCode: string) => {
    setCheckoutError('');
    setPendingPlan(planCode);
    try {
      const data = await billingService.createCheckoutSession({
        plan_code: planCode,
        billing_cycle: cycle,
      });
      if (!data.url) throw new Error('Could not start checkout.');
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Could not start checkout.');
      setPendingPlan(null);
    }
  };

  const startTopup = async (packCode: string) => {
    setCheckoutError('');
    setPendingPack(packCode);
    try {
      const data = await billingService.createTopupSession({ pack_code: packCode, quantity: 1 });
      if (!data.url) throw new Error('Could not start top-up checkout.');
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Could not start top-up checkout.');
      setPendingPack(null);
    }
  };

  const submitSales = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalesError('');
    setSalesSuccess(false);
    setSalesSubmitting(true);
    try {
      const data = await billingService.salesSeatRequest({
        requested_seats: requestedSeats || 0,
        note: note || '',
      });
      if (!data.ok) throw new Error('Could not submit request.');
      setSalesSuccess(true);
      setRequestedSeats(10);
      setNote('');
      success('Request submitted', 'Our team will reach out shortly.');
    } catch (err) {
      setSalesError(err instanceof Error ? err.message : 'Could not submit request.');
      error('Request failed', err instanceof Error ? err.message : 'Could not submit request.');
    } finally {
      setSalesSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="text-center mb-5">
        <h1 className="h2 mb-3">Choose your plan</h1>
        <p className="text-muted">
          Bring your own API keys — pay Quralyst for the intelligence layer.
        </p>

        <div className="btn-group mt-3" role="group" aria-label="Billing cycle">
          <input
            type="radio"
            className="btn-check"
            name="billingCycle"
            id="cycleMonthly"
            autoComplete="off"
            checked={!annual}
            onChange={() => setCycle('monthly')}
          />
          <label className="btn btn-outline-primary" htmlFor="cycleMonthly">
            Monthly
          </label>

          <input
            type="radio"
            className="btn-check"
            name="billingCycle"
            id="cycleAnnual"
            autoComplete="off"
            checked={annual}
            onChange={() => setCycle('annual')}
          />
          <label className="btn btn-outline-primary" htmlFor="cycleAnnual">
            Annual <span className="badge bg-success ms-1">Save 20%</span>
          </label>
        </div>
      </div>

      {!loading && (
        <div className="row g-4 justify-content-center">
          {plans.map((plan) => {
            const isCurrent = currentPlanCode === plan.code;
            const price = annual ? plan.annualMonthlyEquivalent : plan.monthlyPrice;
            return (
              <div className="col-md-4" key={plan.code}>
                <Card className={`h-100 shadow-sm${isCurrent ? ' border-primary border-2' : ''}`}>
                  <div className="card-body d-flex flex-column">
                    <h3 className="card-title">{plan.name}</h3>
                    <p className="text-muted small">{plan.description}</p>

                    {plan.isSelfServe ? (
                      <div className="my-3">
                        <h2 className="h2 mb-0 plan-price">${price}</h2>
                        <small className="text-muted plan-cycle-label">{cycleLabel}</small>
                      </div>
                    ) : (
                      <div className="my-3">
                        <h2 className="h2 mb-0">Custom</h2>
                        <small className="text-muted">Contact sales</small>
                      </div>
                    )}

                    <ul className="list-unstyled small mt-3 mb-4">
                      <li>
                        <i className="bi bi-check-circle text-success" />{' '}
                        {plan.companiesPerMonth ?? 'Custom'} companies/month
                      </li>
                      <li>
                        <i className="bi bi-check-circle text-success" />{' '}
                        {plan.seatsIncluded ?? 'Custom'} seat{plan.seatsIncluded === 1 ? '' : 's'}{' '}
                        included
                      </li>
                      {plan.trialDays ? (
                        <li>
                          <i className="bi bi-check-circle text-success" /> {plan.trialDays}-day
                          free trial (no card required)
                        </li>
                      ) : null}
                      {Object.entries(plan.features)
                        .filter(([, enabled]) => enabled)
                        .map(([feat]) => (
                          <li key={feat}>
                            <i className="bi bi-check-circle text-success" />{' '}
                            {titleizeFeature(feat)}
                          </li>
                        ))}
                    </ul>

                    <div className="mt-auto">
                      {isCurrent ? (
                        <button className="btn btn-standard w-100" disabled>
                          Current plan
                        </button>
                      ) : !plan.isSelfServe ? (
                        salesRequestOrgSlug ? (
                          <button
                            type="button"
                            className="btn btn-standard w-100"
                            onClick={salesModal.show}
                          >
                            Talk to sales
                          </button>
                        ) : (
                          <a href="mailto:sales@quralyst.ai" className="btn btn-standard w-100">
                            Talk to sales
                          </a>
                        )
                      ) : (
                        <button
                          className="btn btn-standard w-100 checkout-btn"
                          disabled={pendingPlan === plan.code}
                          onClick={() => void startCheckout(plan.code)}
                        >
                          {pendingPlan === plan.code
                            ? 'Redirecting...'
                            : plan.trialDays
                              ? 'Start free trial'
                              : 'Get started'}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {checkoutError && (
        <div className="alert alert-danger mt-4" id="checkoutError">
          {checkoutError}
        </div>
      )}

      {topupEntries.length > 0 && (
        <>
          <hr className="my-5" />
          <div className="text-center mb-4">
            <h2 className="h2 mb-2">Need more credits?</h2>
            <p className="text-muted">
              One-time top-ups — never expire, consumed after your monthly plan credits.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {topupEntries.map(([code, pack]) => (
              <div className="col-md-4" key={code}>
                <Card className="h-100 shadow-sm text-center">
                  <div className="card-body d-flex flex-column">
                    <h4 className="card-title mb-1">{pack.credits} credits</h4>
                    <p className="text-muted small mb-3">{pack.credits * 10} companies</p>

                    <div className="my-3">
                      <h2 className="h2 mb-0">${pack.price}</h2>
                      <small className="text-muted">
                        ${(pack.price / pack.credits).toFixed(4)} per credit
                      </small>
                    </div>

                    <div className="mt-auto">
                      <button
                        className="btn btn-standard w-100 topup-btn"
                        disabled={pendingPack === code}
                        onClick={() => void startTopup(code)}
                      >
                        {pendingPack === code ? 'Redirecting...' : `Buy ${pack.credits} credits`}
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
          <p className="text-center text-muted small mt-3">
            Top-ups require an active subscription. They&apos;re consumed only after your plan
            credits run out.
          </p>
        </>
      )}

      <Modal
        open={salesModal.open}
        onClose={salesModal.close}
        title="Talk to sales — request seats"
        size="md"
      >
        <form id="salesSeatForm" onSubmit={submitSales}>
          <p className="text-muted small">
            Tell us how many additional seats you need. Our team will reach out to discuss
            enterprise pricing.
          </p>
          <div className="mb-3">
            <label className="form-label" htmlFor="salesSeatCount">
              Additional seats
            </label>
            <input
              id="salesSeatCount"
              type="number"
              className="form-control"
              name="requested_seats"
              value={requestedSeats}
              min={1}
              required
              onChange={(e) => setRequestedSeats(Number(e.target.value))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="salesSeatNote">
              Notes (optional)
            </label>
            <textarea
              id="salesSeatNote"
              className="form-control"
              name="note"
              rows={3}
              placeholder="Anything we should know?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {salesError && <div className="alert alert-danger mb-0">{salesError}</div>}
          {salesSuccess && (
            <div className="alert alert-success mb-0">
              Request submitted. Our team will reach out shortly.
            </div>
          )}
          <div className="popup-buttons mt-3">
            <Button variant="standard" type="button" onClick={salesModal.close}>
              Cancel
            </Button>
            <Button variant="standard" type="submit" loading={salesSubmitting}>
              {salesSubmitting ? 'Submitting...' : 'Submit request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
