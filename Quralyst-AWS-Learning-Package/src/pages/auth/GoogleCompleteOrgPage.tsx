// GoogleCompleteOrgPage — port of auth/google_complete_org.html. Minimal centered card (Bootstrap
// form-control styling) to finish a Google signup: name + org join/create + domain. email/prefill
// come from the OAuth return (mocked via query params).
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';

export default function GoogleCompleteOrgPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { error } = useToast();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? 'you@example.com';

  const [form, setForm] = useState({
    firstName: searchParams.get('first') ?? '',
    lastName: searchParams.get('last') ?? '',
    orgId: '',
    orgName: '',
    mobileNumber: '',
    primaryDomain: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { user, token, expiresIn } = await authService.googleCompleteOrg({ email, ...form });
      login(user, token, expiresIn);
      navigate(paths.processPreference);
    } catch {
      error('Could not complete signup', 'Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card p-4">
        <h1>Complete your account</h1>
        <p className="text-muted">Signed in as {email} (Google)</p>
        <form onSubmit={onSubmit}>
          <input type="hidden" name="email" value={email} />
          <div className="mb-2">
            <label htmlFor="gc_first_name">First name</label>
            <input
              id="gc_first_name"
              className="form-control"
              value={form.firstName}
              onChange={set('firstName')}
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="gc_last_name">Last name</label>
            <input
              id="gc_last_name"
              className="form-control"
              value={form.lastName}
              onChange={set('lastName')}
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="gc_org_id">Organization ID (join code)</label>
            <input
              id="gc_org_id"
              className="form-control"
              placeholder="QR-XXXXXX"
              value={form.orgId}
              onChange={set('orgId')}
            />
          </div>
          <div className="mb-2">
            <label htmlFor="gc_org_name">New organization name</label>
            <input
              id="gc_org_name"
              className="form-control"
              placeholder="If creating a new org"
              value={form.orgName}
              onChange={set('orgName')}
            />
          </div>
          <div className="mb-2">
            <label htmlFor="gc_mobile">Mobile</label>
            <input
              id="gc_mobile"
              className="form-control"
              value={form.mobileNumber}
              onChange={set('mobileNumber')}
            />
          </div>
          <div className="mb-2">
            <label htmlFor="gc_primary_domain">
              Company domain <span className="text-danger">*</span>{' '}
              <span className="text-muted small">(required if you create a new org)</span>
            </label>
            <input
              id="gc_primary_domain"
              className="form-control"
              placeholder="company.com"
              value={form.primaryDomain}
              onChange={set('primaryDomain')}
            />
            <div className="form-text">Must match your Google account email&apos;s domain.</div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
