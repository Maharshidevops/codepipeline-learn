// Client-visible auth cookies (httpOnly tokens are cleared by the backend on logout / 401).
export const CSRF_COOKIE = 'XSRF-TOKEN';

/** Clear readable cookies the SPA can reach (XSRF). httpOnly tokens need Set-Cookie from the API. */
export function clearClientAuthCookies(): void {
  document.cookie = `${CSRF_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}
