// PasswordRequirements — live ✓/✕ checklist matching Backup/utils/password_policy.py.
// Renders the same <ul.password-req-list><li.password-req-item data-req=...> markup. Calls
// onValidChange(allRulesMet && (confirm matches if provided)) so the parent can gate submit.
import { useEffect } from 'react';
import {
  allPasswordRulesMet,
  evaluatePasswordRules,
  passwordsMatch,
  type PasswordRuleKey,
} from '@/lib/password';
import './PasswordRequirements.css';

const ICON_MET = '✓'; // ✓
const ICON_UNMET = '✕'; // ✕

const RULES: { key: PasswordRuleKey; label: string }[] = [
  { key: 'length', label: 'Minimum length required is 8 characters' },
  { key: 'number', label: 'At least one number' },
  { key: 'special', label: 'At least one special character' },
  { key: 'upper', label: 'At least one uppercase' },
  { key: 'lower', label: 'At least one lowercase' },
];

export interface PasswordRequirementsProps {
  password: string;
  confirm?: string;
  onValidChange?: (ok: boolean) => void;
  id?: string;
}

export default function PasswordRequirements({
  password,
  confirm,
  onValidChange,
  id,
}: PasswordRequirementsProps) {
  const rules = evaluatePasswordRules(password);
  const rulesOk = allPasswordRulesMet(rules);
  const matchOk = confirm === undefined || passwordsMatch(password, confirm);
  const ok = rulesOk && matchOk;

  useEffect(() => {
    onValidChange?.(ok);
  }, [ok, onValidChange]);

  return (
    <ul className="password-req-list" id={id} aria-live="polite">
      {RULES.map(({ key, label }) => {
        const met = rules[key];
        return (
          <li key={key} className={`password-req-item${met ? ' met' : ''}`} data-req={key}>
            <span className="password-req-icon" aria-hidden="true">
              {met ? ICON_MET : ICON_UNMET}
            </span>{' '}
            <span className="password-req-label">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
