// AuthShell — the shared split layout for every auth page (auth.css): navy gradient panel on the
// left (logo + heading + 3D blob shapes) and the white .auth-card on the right. Pages pass a
// `pageClass` (login-page / signup-page / recovery-page / pending-page recovery-page), the left-side
// content, the card header, and the card body. Mirrors the structure shared by all auth templates.
import { type ReactNode } from 'react';

export interface AuthShellProps {
  pageClass: string;
  left: ReactNode;
  cardHeader: ReactNode;
  cardClass?: string;
  children: ReactNode;
}

export default function AuthShell({
  pageClass,
  left,
  cardHeader,
  cardClass,
  children,
}: AuthShellProps) {
  return (
    <div className={`auth-container ${pageClass}`}>
      <div className="auth-left">
        <img src="/images/logo.png" alt="QuraLyst Logo" className="logo-img" />
        {left}
        <img
          src="/images/auth/3d_bottom.png"
          alt=""
          className="shape-bottom"
          loading="lazy"
          decoding="async"
        />
        <img
          src="/images/auth/3d_bottom_right.png"
          alt=""
          className="shape-bottom-right"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="auth-right">
        <img
          src="/images/auth/3d_topright.png"
          alt=""
          className="shape-topright"
          loading="lazy"
          decoding="async"
        />
        <div className={`auth-card${cardClass ? ` ${cardClass}` : ''}`}>
          {cardHeader}
          {children}
        </div>
      </div>
    </div>
  );
}

// ----- shared sub-pieces -----

// Brand left panel (login / signup / registration pages): "Sign In to **Quralyst**" + tagline.
export function BrandLeft({ topLine, description }: { topLine: string; description: ReactNode }) {
  return (
    <div className="auth-content recovery-content">
      <h2 className="auth-brand-topline">{topLine}</h2>
      <h1 className="name-text-img auth-brand-line">Quralyst</h1>
      <p>{description}</p>
    </div>
  );
}

// Recovery left panel (forgot / reset password): smaller heading + supporting line.
export function RecoveryLeft({ title, text }: { title: string; text: ReactNode }) {
  return (
    <div className="auth-content recovery-content">
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

// Right-card header: subtitle ("Welcome to Quralyst") + big title, optional top-right link block.
export function AuthCardHeader({
  title,
  subtitle = (
    <>
      Welcome to <strong>Quralyst</strong>
    </>
  ),
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="auth-card-header">
      <div className="auth-card-header-left">
        <div className="subtitle">{subtitle}</div>
        <h1>{title}</h1>
      </div>
      {right && <div className="auth-card-header-right">{right}</div>}
    </div>
  );
}
