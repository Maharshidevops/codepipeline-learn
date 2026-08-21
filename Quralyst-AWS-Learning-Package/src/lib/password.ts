// Password policy — verbatim port of Backup/static/js/password_requirements.js
// (which mirrors Backup/utils/password_policy.py). Reuse for live hints + Zod validation.
export const PASSWORD_REQ_MIN_LENGTH = 8;
// Same set as Python _SPECIAL_CHARS.
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.?/`~';

export interface PasswordRules {
  length: boolean;
  number: boolean;
  special: boolean;
  upper: boolean;
  lower: boolean;
}

export type PasswordRuleKey = keyof PasswordRules;

function hasSpecialChar(pw: string): boolean {
  for (let i = 0; i < pw.length; i++) {
    if (SPECIAL.indexOf(pw.charAt(i)) !== -1) return true;
  }
  return false;
}

export function evaluatePasswordRules(pw: string | null | undefined): PasswordRules {
  const value = pw == null ? '' : String(pw);
  return {
    length: value.length >= PASSWORD_REQ_MIN_LENGTH,
    number: /\d/.test(value),
    special: hasSpecialChar(value),
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
  };
}

export function allPasswordRulesMet(rules: PasswordRules): boolean {
  return rules.length && rules.number && rules.special && rules.upper && rules.lower;
}

export function passwordMeetsAllRequirements(pw: string | null | undefined): boolean {
  return allPasswordRulesMet(evaluatePasswordRules(pw));
}

export function passwordsMatch(
  pw: string | null | undefined,
  confirm: string | null | undefined,
): boolean {
  return String(pw == null ? '' : pw) === String(confirm == null ? '' : confirm);
}
