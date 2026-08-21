// AcceptInvitePage — port of billing/accept_invite.html. Reads token from ?token= query, loads
// invite info (Spinner while loading), shows org/inviter/role/expiry/currentEmail, and a single
// "Accept invitation" button → acceptInvite → toast + navigate to process-preference. Full-page.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Spinner, Button } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { billingService } from '@/services/api';
import type { AcceptInviteInfo } from '@/services/api/billingService';
import { paths } from '@/routes/paths';
import { formatDateTimeShort } from '@/lib/datetime';
import '@/styles/pages/billing.css';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [info, setInfo] = useState<AcceptInviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadFailed(true);
      return;
    }
    billingService
      .getAcceptInvite(token)
      .then(setInfo)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const data = await billingService.acceptInvite(token);
      if (data.success) {
        success('Invitation accepted', data.message);
        navigate(paths.processPreference);
      } else {
        error('Could not accept invitation', data.message);
        setAccepting(false);
      }
    } catch {
      error('Could not accept invitation', 'Please try again.');
      setAccepting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <Card className="shadow-sm">
            <div className="card-body p-4 text-center">
              {loading ? (
                <Spinner label="Loading invitation" />
              ) : loadFailed || !info ? (
                <>
                  <div className="mb-3">
                    <i className="bi bi-envelope-paper text-primary billing-status-icon" />
                  </div>
                  <h2 className="mb-3">Invitation unavailable</h2>
                  <p className="text-muted">
                    This invitation link is missing or invalid. Please request a new invitation.
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <i className="bi bi-envelope-paper text-primary billing-status-icon" />
                  </div>

                  <h2 className="mb-3">Join {info.orgName || 'this organization'}</h2>

                  <p className="text-muted">
                    <strong>{info.inviterName || info.inviterEmail}</strong> invited you to join{' '}
                    <strong>{info.orgName || 'the organization'}</strong> as a{' '}
                    <strong>{info.role || 'member'}</strong>.
                  </p>

                  <p className="text-muted small">
                    Signed in as <strong>{info.currentEmail}</strong>
                  </p>

                  <div className="mt-4">
                    <Button
                      variant="standard"
                      className="btn-lg w-100"
                      loading={accepting}
                      onClick={() => void accept()}
                    >
                      Accept invitation
                    </Button>
                  </div>

                  <p className="small text-muted mt-3 mb-0">
                    This invitation expires
                    {info.expiresAt ? ` on ${formatDateTimeShort(info.expiresAt)}` : ''}.
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
