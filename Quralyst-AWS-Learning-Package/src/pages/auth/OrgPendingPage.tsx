// OrgPendingPage — port of auth/org_pending.html. Awaiting org-admin approval. email via ?email.
import { useSearchParams } from 'react-router-dom';

export default function OrgPendingPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? 'your email';
  return (
    <div className="auth-container">
      <div className="auth-card p-4">
        <h1>Awaiting organization approval</h1>
        <p>
          Your administrator must approve your membership for <strong>{email}</strong> before you
          can use Quralyst.
        </p>
      </div>
    </div>
  );
}
