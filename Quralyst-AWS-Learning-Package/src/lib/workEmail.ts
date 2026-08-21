// Work-email policy — mirrors Business-Research-Tool---Quralyst/config/constants.py
// (PERSONAL_EMAIL_DOMAINS). Signup and Google OAuth reject these domains.

export const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.in',
  'yahoo.fr',
  'yahoo.de',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'live.com',
  'msn.com',
  'live.co.uk',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'mail.com',
  'yandex.com',
  'gmx.com',
  'gmx.net',
  'inbox.com',
  'fastmail.com',
  'tutanota.com',
  'rediffmail.com',
  'mail.ru',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'web.de',
  't-online.de',
  'orange.fr',
  'free.fr',
  'laposte.net',
  'sky.com',
  'btinternet.com',
  'virginmedia.com',
  'cox.net',
  'comcast.net',
  'verizon.net',
  'att.net',
  'charter.net',
  'sbcglobal.net',
  'ymail.com',
  'rocketmail.com',
  'earthlink.net',
  'juno.com',
  'netzero.com',
  'optonline.net',
]);

export const WORK_EMAIL_REQUIRED_MESSAGE =
  'Please use a work or business email address. Personal email domains are not accepted.';

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1
    ? ''
    : email
        .slice(at + 1)
        .trim()
        .toLowerCase();
}

export function isPersonalEmailDomain(emailOrDomain: string): boolean {
  const value = emailOrDomain.trim().toLowerCase();
  const domain = value.includes('@') ? emailDomain(value) : value;
  return domain !== '' && PERSONAL_EMAIL_DOMAINS.has(domain);
}
