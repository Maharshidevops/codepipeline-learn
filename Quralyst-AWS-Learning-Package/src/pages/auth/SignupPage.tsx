// SignupPage — port of auth/signup.html. JOIN (org_id) ↔ CREATE (org_name + primary_domain) toggle,
// live password checklist + confirm match gating submit, invite token locks email/org_id to JOIN,
// and the signup-success popup on success. Field names/logic match the Flask form; layout/spacing
// match the auth snapshots.
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell, { AuthCardHeader, BrandLeft } from '@/components/auth/AuthShell';
import PasswordRequirements from '@/components/form/PasswordRequirements';
import { authService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import { passwordMeetsAllRequirements, passwordsMatch } from '@/lib/password';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { isPersonalEmailDomain, WORK_EMAIL_REQUIRED_MESSAGE } from '@/lib/workEmail';

function createSignupSchema(skipWorkEmailCheck: boolean) {
  return z
    .object({
      email: z.string().email('Enter a valid email address'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      username: z.string().optional(),
      orgId: z.string().optional(),
      orgName: z.string().optional(),
      primaryDomain: z.string().optional(),
      mobileNumber: z.string().optional(),
      password: z.string().min(1),
      confirmPassword: z.string().min(1),
    })
    .superRefine((data, ctx) => {
      if (!skipWorkEmailCheck && isPersonalEmailDomain(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: WORK_EMAIL_REQUIRED_MESSAGE,
        });
      }
    });
}

type OrgMode = 'join' | 'create';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signupSuccess, error } = useToast();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;
  const inviteEmail = searchParams.get('email') ?? '';
  const inviteOrgId = searchParams.get('org_id') ?? '';

  const schema = useMemo(() => createSignupSchema(!!inviteToken), [inviteToken]);
  type SignupForm = z.infer<typeof schema>;

  // invite_token forces JOIN and locks email + org id.
  const [mode, setMode] = useState<OrgMode>('join');
  const [gateMsg, setGateMsg] = useState(false);
  const [matchMsg, setMatchMsg] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: inviteEmail,
      firstName: '',
      lastName: '',
      username: '',
      orgId: inviteOrgId,
      orgName: '',
      primaryDomain: '',
      mobileNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const showMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const onSubmit = handleSubmit(async (values) => {
    setGateMsg(false);
    setMatchMsg(false);

    if (mode === 'create' && (!values.orgName?.trim() || !values.primaryDomain?.trim())) {
      error(
        'Organization details required',
        'Please enter your organization name and company domain.',
      );
      return;
    }
    if (!passwordMeetsAllRequirements(values.password)) {
      setGateMsg(true);
      return;
    }
    if (!passwordsMatch(values.password, values.confirmPassword)) {
      setMatchMsg(true);
      return;
    }

    try {
      const result = await authService.signup({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username || undefined,
        invite: inviteToken,
        orgId: mode === 'join' ? values.orgId || undefined : undefined,
        orgName: mode === 'create' ? values.orgName || undefined : undefined,
        primaryDomain: mode === 'create' ? values.primaryDomain || undefined : undefined,
        mobileNumber: values.mobileNumber || undefined,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      if (result.signupSuccess) {
        const details = result.userDetails ?? {
          name: `${values.firstName} ${values.lastName}`.trim(),
          username: values.username || '',
          email: values.email,
        };
        signupSuccess(details);
        if (result.redirect === 'registration-pending') {
          navigate(`${paths.auth.registrationPending}?email=${encodeURIComponent(values.email)}`);
        } else if (result.redirect === 'org-pending') {
          navigate(`${paths.auth.orgPending}?email=${encodeURIComponent(values.email)}`);
        } else {
          navigate(paths.auth.login);
        }
      }
    } catch (e) {
      error(
        'Registration failed',
        getAuthErrorMessage(e, 'That email may already be registered. Please try again.'),
      );
    }
  });

  const rulesValid =
    passwordMeetsAllRequirements(password) && passwordsMatch(password, confirmPassword);

  return (
    <AuthShell
      pageClass="signup-page"
      left={
        <BrandLeft
          topLine="Sign Up to"
          description="Quralyst is M&A focused AI copilot built specifically for M&A advisors and deal professionals."
        />
      }
      cardHeader={
        <AuthCardHeader
          title="Sign up"
          right={
            <>
              Already have an account ?<br />
              <Link to={paths.auth.login}>Sign in</Link>
            </>
          }
        />
      }
    >
      {inviteToken && (
        <p className="form-text text-info mb-2">
          You&apos;re signing up with an invitation. After you register you can use the product
          right away — no wait for account approval.
        </p>
      )}

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="signup_email_field">Email</label>
          <input
            id="signup_email_field"
            type="email"
            placeholder="Enter your work or business email"
            readOnly={!!inviteToken}
            {...register('email')}
          />
          {errors.email && <div className="error">{errors.email.message}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="signup_first_name">First Name</label>
          <input
            id="signup_first_name"
            type="text"
            placeholder="Enter your first name"
            {...register('firstName')}
          />
          {errors.firstName && <div className="error">{errors.firstName.message}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="signup_last_name">Last Name</label>
          <input
            id="signup_last_name"
            type="text"
            placeholder="Enter your last name"
            {...register('lastName')}
          />
          {errors.lastName && <div className="error">{errors.lastName.message}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="signup_username">Username</label>
          <input
            id="signup_username"
            type="text"
            placeholder="Choose a username (optional)"
            {...register('username')}
          />
        </div>

        {mode === 'join' ? (
          <div id="signup-org-join-section">
            {!inviteToken && (
              <div className="signup-org-toggle-row">
                <div className="auth-form-options__forgot">
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid -- legacy-parity link-styled mode toggle (.auth-form-options__forgot a); href="#" keeps native focus + Enter activation, role="button" announces intent. */}
                  <a
                    href="#"
                    role="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setMode('create');
                    }}
                  >
                    New organization
                  </a>
                </div>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="signup_org_id_field">Organization ID</label>
              <input
                id="signup_org_id_field"
                type="text"
                placeholder="Organization join code (e.g. QR-XXXXXX)"
                readOnly={!!inviteToken}
                {...register('orgId')}
              />
            </div>
          </div>
        ) : (
          <div id="signup-org-create-section">
            <div className="signup-org-toggle-row">
              <div className="auth-form-options__forgot">
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid -- legacy-parity link-styled mode toggle (.auth-form-options__forgot a); href="#" keeps native focus + Enter activation, role="button" announces intent. */}
                <a
                  href="#"
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('join');
                  }}
                >
                  I have an organization ID
                </a>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="signup_org_name_field">Organization Name</label>
              <input
                id="signup_org_name_field"
                type="text"
                placeholder="Your organization name"
                {...register('orgName')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signup_primary_domain">
                Company domain <span className="text-danger">*</span>
              </label>
              <input
                id="signup_primary_domain"
                type="text"
                placeholder="company.com"
                autoComplete="organization-title"
                {...register('primaryDomain')}
              />
              <div className="form-text">
                Required. Your email must be on this domain; teammates you invite must use the same
                company domain.
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="signup_mobile">Mobile Number</label>
          <input
            id="signup_mobile"
            type="tel"
            placeholder="Optional contact number"
            {...register('mobileNumber')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup_password">Password</label>
          <input
            id="signup_password"
            type="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            {...register('password')}
          />
          <PasswordRequirements
            password={password}
            confirm={confirmPassword}
            id="signup-password-reqs"
          />
        </div>
        <div className="form-group">
          <label htmlFor="signup_confirm_password">Confirm Password</label>
          <input
            id="signup_confirm_password"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {showMismatch && (
            <div id="signup-confirm-mismatch" className="error signup-mismatch-error">
              Passwords do not match.
            </div>
          )}
        </div>
        {gateMsg && (
          <div className="error signup-gate-error">
            Please meet all password requirements before continuing.
          </div>
        )}
        {matchMsg && <div className="error">Passwords must match before continuing.</div>}
        <button
          type="submit"
          className="auth-button"
          id="signup-submit-btn"
          disabled={isSubmitting || !rulesValid}
        >
          Sign Up
        </button>
      </form>
    </AuthShell>
  );
}
